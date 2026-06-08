const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

const userPath = path.join(__dirname, 'class', 'user.json'); 
const tugasPath = path.join(__dirname, 'class', 'tugas.json');
const communityUsersPath = path.join(__dirname, 'comunity_page', 'users.json');
const communityPostPath = path.join(__dirname, 'comunity_page', 'post.json');

const readJSON = (filePath) => {
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const writeJSON = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
};

// ==========================================
// ENDPOINT PENUGASAN DINAMIS
// ==========================================

app.post('/api/verify-teacher', (req, res) => {
    const { username, password } = req.body;
    const users = readJSON(communityUsersPath);
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    
    if (user && user.teacher === true) {
        return res.json({ success: true, teacherName: user.displayname });
    }
    return res.status(403).json({ success: false, message: "Kredensial salah atau kamu bukan guru." });
});

app.get('/api/assignments', (req, res) => {
    let tugas = readJSON(tugasPath);
    const now = new Date();
    const validTugas = tugas.filter(t => new Date(t.deadline) > now);
    if (tugas.length !== validTugas.length) writeJSON(tugasPath, validTugas);
    res.json({ success: true, assignments: validTugas });
});

app.get('/api/assignments/:id', (req, res) => {
    let tugas = readJSON(tugasPath);
    const tIndex = tugas.findIndex(x => x.id === req.params.id);
    if (tIndex === -1) return res.status(404).json({ success: false, message: "Tugas tidak ditemukan." });
    
    if (new Date(tugas[tIndex].deadline) <= new Date()) {
        tugas.splice(tIndex, 1);
        writeJSON(tugasPath, tugas);
        return res.status(403).json({ success: false, message: "Tugas sudah kedaluwarsa dan telah dihapus dari sistem." });
    }
    res.json({ success: true, assignment: tugas[tIndex] });
});

app.post('/api/assignments/create', (req, res) => {
    const { title, deadline, items, username, password } = req.body;
    const users = readJSON(communityUsersPath);
    const validTeacher = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password && u.teacher === true);
    if (!validTeacher) return res.status(403).json({ success: false, message: "Akses ditolak. Validasi server gagal!" });

    let tugas = readJSON(tugasPath);
    const newTugas = {
        id: "tugas_" + Date.now(),
        title,
        teacher: validTeacher.displayname,
        deadline,
        items,
        answeredUids: []
    };
    tugas.push(newTugas);
    writeJSON(tugasPath, tugas);
    res.json({ success: true, message: "Tugas berhasil diterbitkan!" });
});

app.post('/api/submit-assignment', (req, res) => {
    const { uid, answers, assignmentId } = req.body;
    if (!uid || !answers || !assignmentId) return res.status(400).json({ success: false, message: "Data tidak lengkap." });

    let tugas = readJSON(tugasPath);
    const tIndex = tugas.findIndex(x => x.id === assignmentId);
    if (tIndex === -1) return res.status(404).json({ success: false, message: "Tugas tidak ditemukan." });
    
    const assignment = tugas[tIndex];
    if (assignment.answeredUids.includes(uid.toLowerCase())) return res.status(403).json({ success: false, message: "Kamu sudah mengerjakan tugas ini!" });

    let userData = readJSON(userPath);
    const userMatch = userData.find(u => u.uid.toLowerCase() === uid.toLowerCase());
    if (!userMatch) return res.status(404).json({ success: false, message: "UID tidak ditemukan dalam daftar member!" });

    let correctCount = 0;
    const questions = assignment.items.filter(item => item.type === 'question');
    const totalQuestions = questions.length;

    questions.forEach((q, idx) => {
        const selectedOpt = answers[`q_${idx}`];
        if (selectedOpt !== undefined && parseInt(selectedOpt) === q.answerIndex) correctCount++;
    });

    const finalScore = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    
    assignment.answeredUids.push(uid.toLowerCase());
    writeJSON(tugasPath, tugas);

    userMatch.score += finalScore;
    writeJSON(userPath, userData);

    res.json({ success: true, name: userMatch.name, correctCount, totalQuestions, score: finalScore });
});

// ==========================================
// ENDPOINT KOMUNITAS
// ==========================================

app.post('/api/community/register', (req, res) => {
    const { username, password } = req.body;
    const validRegex = /^[a-zA-Z0-9_.]+$/;
    if (!validRegex.test(username) || !validRegex.test(password)) {
        return res.status(400).json({ success: false, message: "Karakter unik tidak diizinkan. Gunakan huruf, angka, _, atau ." });
    }

    let users = readJSON(communityUsersPath);
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        return res.status(400).json({ success: false, message: "Username sudah digunakan!" });
    }

    const uid = Math.floor(10000000 + Math.random() * 90000000).toString();
    const newUser = {
        uid: uid,
        username: username,
        password: password,
        displayname: username,
        teacher: false,
        profilePic: "../images/members/blank.png"
    };
    
    users.push(newUser);
    writeJSON(communityUsersPath, users);
    
    const { password: _, ...safeData } = newUser;
    res.json({ success: true, user: safeData });
});

app.post('/api/community/login', (req, res) => {
    const { username, password } = req.body;
    const users = readJSON(communityUsersPath);
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (!user) return res.status(404).json({ success: false, message: "Username atau password salah!" });
    const { password: _, ...safeUserData } = user;
    return res.json({ success: true, user: safeUserData });
});

app.get('/api/community/profile/:uid', (req, res) => {
    const users = readJSON(communityUsersPath);
    const user = users.find(u => u.uid === req.params.uid);
    if (!user) return res.status(404).json({ success: false, message: "User tidak ditemukan!" });
    const { password, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
});

app.post('/api/community/profile/update', (req, res) => {
    const { currentUsername, password, newUsername, newDisplayName, newProfilePic, newPassword } = req.body;
    let users = readJSON(communityUsersPath);
    const userIndex = users.findIndex(u => u.username.toLowerCase() === currentUsername.toLowerCase() && u.password === password);
    
    if (userIndex === -1) return res.status(403).json({ success: false, message: "Password konfirmasi salah!" });
    
    if (newUsername && newUsername.toLowerCase() !== currentUsername.toLowerCase()) {
        if (users.some(u => u.username.toLowerCase() === newUsername.toLowerCase())) {
            return res.status(400).json({ success: false, message: "Username baru sudah dipakai!" });
        }
        let posts = readJSON(communityPostPath);
        posts.forEach(p => { 
            if (p.username.toLowerCase() === currentUsername.toLowerCase()) p.username = newUsername; 
            if (p.comments) {
                p.comments.forEach(c => { if(c.username.toLowerCase() === currentUsername.toLowerCase()) c.username = newUsername; });
            }
        });
        writeJSON(communityPostPath, posts);
        users[userIndex].username = newUsername;
    }
    
    if (newDisplayName) users[userIndex].displayname = newDisplayName;
    if (newProfilePic) users[userIndex].profilePic = newProfilePic;
    if (newPassword) users[userIndex].password = newPassword;
    
    writeJSON(communityUsersPath, users);
    const { password: _, ...updatedUser } = users[userIndex];
    return res.json({ success: true, user: updatedUser });
});

app.get('/api/community/posts', (req, res) => {
    const posts = readJSON(communityPostPath);
    const users = readJSON(communityUsersPath);
    const sortedPosts = posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    const enrichedPosts = sortedPosts.map(post => {
        const author = users.find(u => u.username.toLowerCase() === post.username.toLowerCase()) || { displayname: "Unknown", username: post.username, profilePic: "../images/members/blank.png", uid: "" };
        return { 
            ...post, 
            comments: post.comments || [],
            author: { displayname: author.displayname, username: author.username, profilePic: author.profilePic, uid: author.uid } 
        };
    });
    return res.json({ success: true, posts: enrichedPosts });
});

app.post('/api/community/posts/create', (req, res) => {
    const { username, password, title, description, media } = req.body;
    const users = readJSON(communityUsersPath);
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (!user) return res.status(403).json({ success: false, message: "Validasi Gagal! Password salah." });
    
    let posts = readJSON(communityPostPath);
    let mediaType = "image";
    if (media && (media.endsWith('.mp4') || media.endsWith('.webm') || media.endsWith('.ogg'))) mediaType = "video";
    
    const newPost = { id: "post_" + Date.now(), username: user.username, title, description, media: media || "", mediaType, date: new Date().toISOString(), likes: 0, comments: [] };
    posts.push(newPost);
    writeJSON(communityPostPath, posts);
    return res.json({ success: true, message: "Post berhasil dibuat!" });
});

app.post('/api/community/posts/like', (req, res) => {
    const { postId } = req.body;
    let posts = readJSON(communityPostPath);
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return res.status(404).json({ success: false, message: "Post tidak ditemukan." });
    posts[postIndex].likes += 1;
    writeJSON(communityPostPath, posts);
    return res.json({ success: true, likes: posts[postIndex].likes });
});

app.post('/api/community/posts/delete', (req, res) => {
    const { postId, username, password } = req.body;
    const users = readJSON(communityUsersPath);
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (!user) return res.status(403).json({ success: false, message: "Password salah!" });
    
    let posts = readJSON(communityPostPath);
    const post = posts.find(p => p.id === postId);
    if (!post) return res.status(404).json({ success: false, message: "Post tidak ditemukan." });
    if (post.username.toLowerCase() !== username.toLowerCase()) return res.status(401).json({ success: false, message: "Bukan postinganmu!" });
    
    posts = posts.filter(p => p.id !== postId);
    writeJSON(communityPostPath, posts);
    return res.json({ success: true, message: "Post berhasil dihapus!" });
});

app.post('/api/community/posts/comment', (req, res) => {
    const { postId, username, text } = req.body;
    let posts = readJSON(communityPostPath);
    const postIndex = posts.findIndex(p => p.id === postId);
    
    if (postIndex === -1) return res.status(404).json({ success: false, message: "Post tidak ditemukan." });
    
    if (!posts[postIndex].comments) posts[postIndex].comments = [];
    posts[postIndex].comments.push({ username, text, date: new Date().toISOString() });
    
    writeJSON(communityPostPath, posts);
    return res.json({ success: true, message: "Komentar berhasil ditambahkan!" });
});

app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`Dlawals Server berjalan di http://localhost:${PORT}`);
    console.log(`=========================================`);
});
