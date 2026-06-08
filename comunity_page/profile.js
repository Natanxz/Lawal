document.addEventListener("DOMContentLoaded", async () => {
    let profileUser = null; 
    let currentEditField = "";
    
    const urlParams = new URLSearchParams(window.location.search);
    const targetUid = urlParams.get('uid');
    
    // Deteksi akun yang login
    const currentUserSession = JSON.parse(localStorage.getItem("dlawals_user"));

    if (!targetUid) {
        alert("Profil tidak ditemukan! Mengalihkan ke forum...");
        window.location.href = "forum.html";
        return;
    }

    try {
        const response = await fetch(`/api/community/profile/${targetUid}`);
        const data = await response.json();
        if (data.success) {
            profileUser = data.user;
            renderProfile();
        } else {
            alert(data.message);
            window.location.href = "forum.html";
        }
    } catch (e) { console.error(e); }

    function renderProfile() {
        document.getElementById("displayAvatar").src = profileUser.profilePic;
        document.getElementById("displayNick").textContent = profileUser.displayname;
        document.getElementById("displayUser").textContent = `@${profileUser.username}`;
        document.getElementById("profileView").style.display = "block";

        // Cek jika akun yang dibuka adalah milik user yang sedang login
        const isOwner = currentUserSession && currentUserSession.uid === profileUser.uid;
        
        if (isOwner) {
            document.getElementById("btnEditAvatar").style.display = "block";
            document.getElementById("btnEditNick").style.display = "block";
            document.getElementById("btnEditUser").style.display = "block";
            document.getElementById("passwordGroup").style.display = "flex";
            document.getElementById("btnLogout").style.display = "block";
        }
    }

    document.getElementById("btnEditAvatar")?.addEventListener("click", () => openEditBox("avatar", "EDIT FOTO URL", profileUser.profilePic));
    document.getElementById("btnEditNick")?.addEventListener("click", () => openEditBox("nick", "EDIT DISPLAY NAME", profileUser.displayname));
    document.getElementById("btnEditUser")?.addEventListener("click", () => openEditBox("user", "EDIT USERNAME", profileUser.username));
    document.getElementById("btnEditPass")?.addEventListener("click", () => openEditBox("password", "UBAH PASSWORD BARU", ""));

    document.getElementById("btnLogout")?.addEventListener("click", () => {
        const sure = confirm("Kamu yakin ingin keluar dari akun ini?");
        if (sure) {
            localStorage.removeItem("dlawals_user");
            window.location.href = "forum.html";
        }
    });

    function openEditBox(field, title, currentVal) {
        currentEditField = field;
        document.getElementById("editTitle").textContent = title;
        
        const inputNew = document.getElementById("editNewValue");
        inputNew.type = field === "password" ? "password" : "text";
        inputNew.value = currentVal;
        
        document.getElementById("editError").style.display = "none";
        document.getElementById("confirmPass").value = "";
        
        document.getElementById("editPopup").classList.add("active");
    }

    document.getElementById("btnCancelEdit").addEventListener("click", () => document.getElementById("editPopup").classList.remove("active"));

    document.getElementById("btnSaveEdit").addEventListener("click", async () => {
        const newValue = document.getElementById("editNewValue").value;
        const confirmPass = document.getElementById("confirmPass").value;
        const editError = document.getElementById("editError");

        if (!newValue || !confirmPass) {
            editError.style.display = "block"; 
            editError.textContent = "Data dan Password wajib diisi!"; 
            return;
        }

        let payload = {
            currentUsername: currentUserSession.username,
            password: confirmPass
        };

        if (currentEditField === "avatar") payload.newProfilePic = newValue;
        if (currentEditField === "nick") payload.newDisplayName = newValue;
        if (currentEditField === "user") payload.newUsername = newValue;
        if (currentEditField === "password") payload.newPassword = newValue; 

        try {
            const response = await fetch('/api/community/profile/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (data.success) {
                // Perbarui sesi lokal dengan data baru
                localStorage.setItem("dlawals_user", JSON.stringify(data.user)); 
                alert("Data berhasil diperbarui!");
                // Jika ganti username, URL bisa berubah. Kita paksa reload ke uid baru.
                window.location.href = `profile.html?uid=${data.user.uid}`;
            } else {
                editError.style.display = "block";
                editError.textContent = data.message;
            }
        } catch (err) {
            editError.style.display = "block";
            editError.textContent = "Terjadi kegagalan server.";
        }
    });
});
