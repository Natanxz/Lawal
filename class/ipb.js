let quizData = null;

document.addEventListener("DOMContentLoaded", () => {
    loadQuizData();
});

// Load data kuis dari file json lewat server
async function loadQuizData() {
    const mainContent = document.getElementById("mainContent");
    try {
        const response = await fetch("ipb.json");
        if (!response.ok) throw new Error("Gagal memuat ipb.json");
        quizData = await response.json();
        renderQuiz();
    } catch (err) {
        console.error(err);
        renderFallback();
    }
}

function renderFallback() {
    const mainContent = document.getElementById("mainContent");
    mainContent.innerHTML = `
        <div class="fallback-view">
            <h2 class="fallback-title">Tidak ada soal</h2>
            <p class="fallback-desc">Tunggu guru memberikan tugas berikutnya.</p>
        </div>
    `;
}

function renderQuiz() {
    const mainContent = document.getElementById("mainContent");
    if (!quizData || !quizData.questions || quizData.questions.length === 0) {
        renderFallback();
        return;
    }

    let html = `<form class="quiz-form" id="quizForm" onsubmit="handleFormSubmit(event)">`;

    quizData.questions.forEach((q) => {
        html += `
            <div class="question-card">
                <h2 class="question-text">${q.id}. ${escapeHtml(q.question)}</h2>
                <div class="options-list">
        `;

        q.options.forEach((opt, optIndex) => {
            html += `
                <label class="option-item">
                    <input type="radio" name="q_${q.id}" value="${optIndex}" required>
                    <span>${escapeHtml(opt)}</span>
                </label>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    html += `
        <button type="submit" class="submit-btn">Jawab</button>
    </form>`;

    mainContent.innerHTML = html;
}

function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function handleFormSubmit(e) {
    e.preventDefault();
    document.getElementById("uidModal").style.display = "flex";
    document.getElementById("uidInput").focus();
}

function closeModal() {
    document.getElementById("uidModal").style.display = "none";
    document.getElementById("uidInput").value = "";
}

// KIRIM DATA SUBMISSION KE SERVER VIA FETCH POST API
async function processQuizSubmission() {
    const uidInput = document.getElementById("uidInput").value.trim().toLowerCase();
    const modalTitle = document.getElementById("modalTitle");
    const modalDesc = document.getElementById("modalDesc");
    const modalBtnRow = document.getElementById("modalBtnRow");

    if (!uidInput) {
        alert("Harap masukkan UID terlebih dahulu.");
        return;
    }

    // Ambil semua jawaban dari form kuis
    const form = document.getElementById("quizForm");
    const answers = {};
    quizData.questions.forEach(q => {
        const selectedOpt = form.querySelector(`input[name="q_${q.id}"]:checked`);
        if (selectedOpt) {
            answers[`q_${q.id}`] = selectedOpt.value;
        }
    });

    try {
        // Kirim request ke endpoint API server Node.js
        const response = await fetch('/api/submit-quiz', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ uid: uidInput, answers })
        });

        const result = await response.json();

        if (!response.ok) {
            alert(result.message || "Gagal mengumpulkan kuis.");
            return;
        }

        // Tampilkan Hasil Keberhasilan Langsung tanpa refresh panel
        modalTitle.innerText = "Tugas Terkirim!";
        modalDesc.innerHTML = `
            Selamat <strong>${result.name}</strong>!<br>
            Skor kuis ini: <strong>${result.score}</strong><br>
            Tepat: ${result.correctCount}/${result.totalQuestions}<br><br>
            <span style="color: #5cff9c; font-size:12px;">Database ipb.json & user.json telah berhasil diperbarui secara otomatis.</span>
        `;
        
        modalBtnRow.innerHTML = `
            <button class="modal-btn btn-confirm" style="width:100%;" onclick="location.reload()">Selesai</button>
        `;
        document.getElementById("uidInput").style.display = "none";

    } catch (error) {
        console.error(error);
        alert("Koneksi gagal! Pastikan server Node.js milikmu sedang berjalan.");
    }
}