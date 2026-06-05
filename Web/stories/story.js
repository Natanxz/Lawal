document.addEventListener("DOMContentLoaded", async () => {
    const storyContainer = document.getElementById("storyContent");
    if (!storyContainer) return;

    try {
        // Ambil nama halaman terakhir dari URL
        // Contoh:
        // /stories/rxk/ch1      -> ch1
        // /stories/rxk/ch1.html -> ch1
        let pageName = window.location.pathname.split("/").pop();

        // Hapus .html jika ada
        pageName = pageName.replace(/\.html$/i, "");

        // Nama file txt yang akan dicari
        const txtFile = `${pageName}.txt`;

        const response = await fetch(txtFile, {
            cache: "no-cache"
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const contentType = response.headers.get("content-type") || "";

        // Cegah kasus server malah mengirim HTML
        if (contentType.includes("text/html")) {
            throw new Error(
                `Server mengembalikan HTML, bukan TXT (${txtFile})`
            );
        }

        const data = await response.text();

        storyContainer.innerHTML = "";

        const paragraphs = data.split(/\r?\n\r?\n/);

        paragraphs.forEach(text => {
            const trimmedText = text.trim();

            if (!trimmedText) return;

            const p = document.createElement("p");

            let safeText = trimmedText
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");

            let formattedText = safeText
                .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                .replace(/\*(.*?)\*/g, "<strong>$1</strong>");

            p.innerHTML = formattedText;
            storyContainer.appendChild(p);
        });

    } catch (error) {
        console.error(error);

        storyContainer.innerHTML = `
            <p class="status-msg" style="color:#ff4444;">
                Gagal memuat cerita.<br>
                Pastikan file TXT tersedia dan dapat diakses.
            </p>
        `;
    }
});