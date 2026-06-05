const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware untuk membaca JSON dari body request
app.use(express.json());

// Sajikan folder static (HTML, CSS, JS) agar bisa dibuka di browser
app.use(express.static(path.join(__dirname)));

const ipbPath = path.join(__dirname, 'class', 'ipb.json');
const userPath = path.join(__dirname, 'class', 'user.json');

// Endpoint untuk mengirim jawaban & mengedit file JSON secara langsung
app.post('/api/submit-quiz', (req, res) => {
    const { uid, answers } = req.body;

    if (!uid || !answers) {
        return res.status(400).json({ success: false, message: "Data tidak lengkap." });
    }

    try {
        // 1. Baca database soal (ipb.json)
        if (!fs.existsSync(ipbPath)) {
            return res.status(404).json({ success: false, message: "File ipb.json tidak ditemukan." });
        }
        const quizData = JSON.parse(fs.readFileSync(ipbPath, 'utf8'));

        // Validasi: Apakah UID ini sudah pernah menjawab?
        if (quizData.answeredUids.includes(uid.toLowerCase())) {
            return res.status(403).json({ success: false, message: "Kamu sudah pernah menjawab tugas ini sebelumnya!" });
        }

        // 2. Baca database user (user.json)
        if (!fs.existsSync(userPath)) {
            return res.status(404).json({ success: false, message: "File user.json tidak ditemukan." });
        }
        let userData = JSON.parse(fs.readFileSync(userPath, 'utf8'));

        // Validasi: Apakah UID terdaftar di sistem member?
        const userMatch = userData.find(u => u.uid.toLowerCase() === uid.toLowerCase());
        if (!userMatch) {
            return res.status(404).json({ success: false, message: "UID tidak ditemukan dalam daftar member!" });
        }

        // 3. Hitung Skor
        let correctCount = 0;
        const totalQuestions = quizData.questions.length;

        quizData.questions.forEach(q => {
            const selectedOpt = answers[`q_${q.id}`];
            if (selectedOpt !== undefined && parseInt(selectedOpt) === q.answer) {
                correctCount++;
            }
        });

        const finalScore = Math.round((correctCount / totalQuestions) * 100);

        // 4. UPDATE FILE SECARA LANGSUNG (FileSystem Node.js)
        
        // Tambahkan UID ke daftar answeredUids di ipb.json
        quizData.answeredUids.push(uid.toLowerCase());
        fs.writeFileSync(ipbPath, JSON.stringify(quizData, null, 2), 'utf8');

        // Tambahkan skor ke user di user.json
        userMatch.score += finalScore;
        fs.writeFileSync(userPath, JSON.stringify(userData, null, 2), 'utf8');

        // Kirim respon sukses ke client
        return res.json({
            success: true,
            name: userMatch.name,
            correctCount: correctCount,
            totalQuestions: totalQuestions,
            score: finalScore
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Terjadi kesalahan internal server." });
    }
});

// Menjalankan Server
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`Dlawals Server berjalan di http://localhost:${PORT}`);
    console.log(`=========================================`);
});