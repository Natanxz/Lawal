document.addEventListener("DOMContentLoaded", () => {
    let allPosts = [];
    let displayedCount = 5;
    let currentUser = JSON.parse(localStorage.getItem("dlawals_user")) || null; 
    let currentActivePostId = null; 

    const postsContainer = document.getElementById("postsContainer");
    const loadMoreSection = document.getElementById("loadMoreSection");
    const navProfileAvatar = document.getElementById("navProfileAvatar");

    // Navbar Login/Profile handler
    if (currentUser) {
        navProfileAvatar.src = currentUser.profilePic;
        navProfileAvatar.parentElement.onclick = () => window.location.href = `profile.html?uid=${currentUser.uid}`;
    } else {
        navProfileAvatar.parentElement.onclick = () => document.getElementById("authPopup").classList.add("active");
    }

    // Modal Login Function
    document.getElementById("btnSubmitLogin").addEventListener("click", async () => {
        const username = document.getElementById("authLoginUser").value;
        const password = document.getElementById("authLoginPass").value;
        try {
            const res = await fetch('/api/community/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem("dlawals_user", JSON.stringify(data.user));
                window.location.reload();
            } else {
                document.getElementById("authError").style.display = "block";
                document.getElementById("authError").textContent = data.message;
            }
        } catch(e) {}
    });

    async function fetchPosts() {
        const response = await fetch('/api/community/posts');
        const data = await response.json();
        if (data.success) { 
            allPosts = data.posts; 
            renderPosts(); 
        }
    }

    function renderPosts() {
        postsContainer.innerHTML = "";
        const currentSlice = allPosts.slice(0, displayedCount);
        
        if (currentSlice.length === 0) {
            postsContainer.innerHTML = `<p style="color:var(--text-muted); text-align:center; margin-top:20px;">Belum ada postingan.</p>`;
            return;
        }

        currentSlice.forEach(post => {
            const card = document.createElement("div");
            card.className = "post-card";
            const dateStr = new Date(post.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

            let mediaHTML = "";
            if (post.media) {
                mediaHTML = post.mediaType === "video" ? `<video src="${post.media}" controls class="post-media"></video>` : `<img src="${post.media}" alt="Media" class="post-media">`;
            }

            // Tombol 3 titik hanya untuk pemilik
            let optionsHTML = "";
            if (currentUser && currentUser.username.toLowerCase() === post.username.toLowerCase()) {
                optionsHTML = `
                    <div class="options-menu" id="opt_${post.id}">⋮
                        <div class="options-dropdown" id="drop_${post.id}">
                            <button class="option-btn" id="del_${post.id}">Hapus Postingan</button>
                        </div>
                    </div>`;
            }

            card.innerHTML = `
                <div class="post-header">
                    <div class="post-author-row" style="cursor:pointer;" onclick="window.location.href='profile.html?uid=${post.author.uid}'">
                        <img src="${post.author.profilePic}" alt="Ava" class="author-img">
                        <div>
                            <div class="author-name">${post.author.displayname}</div>
                            <div class="author-username">@${post.author.username}</div>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div class="post-date">${dateStr}</div>
                        ${optionsHTML}
                    </div>
                </div>
                <div style="cursor:pointer;" id="viewPost_${post.id}">
                    <h4 class="post-title">${post.title}</h4>
                    <div class="post-desc">${post.description.substring(0, 150)}${post.description.length > 150 ? '... <b>(Baca selengkapnya)</b>' : ''}</div>
                    ${mediaHTML}
                </div>
                <div class="post-actions">
                    <button class="action-item" id="like_${post.id}"><span>👍</span> <span class="like-count">${post.likes}</span></button>
                    <button class="action-item" onclick="document.getElementById('viewPost_${post.id}').click()"><span>💬</span> ${post.comments ? post.comments.length : 0} Komentar</button>
                </div>
            `;
            postsContainer.appendChild(card);

            // Logika Menu 3 Titik
            if (optionsHTML !== "") {
                card.querySelector(`#opt_${post.id}`).addEventListener("click", (e) => {
                    e.stopPropagation();
                    card.querySelector(`#drop_${post.id}`).classList.toggle("active");
                });
                
                card.querySelector(`#del_${post.id}`).addEventListener("click", async (e) => {
                    e.stopPropagation();
                    const confirmDel = confirm("Hapus postingan secara permanen?");
                    if(confirmDel) {
                        const pass = prompt("Masukkan password untuk konfirmasi hapus:");
                        if(pass) {
                            const res = await fetch('/api/community/posts/delete', {
                                method: 'POST',
                                headers: {'Content-Type':'application/json'},
                                body: JSON.stringify({ postId: post.id, username: currentUser.username, password: pass })
                            });
                            const data = await res.json();
                            if(data.success) fetchPosts(); else alert(data.message);
                        }
                    }
                });
            }

            // Logika Like
            const likeBtn = card.querySelector(`#like_${post.id}`);
            likeBtn.addEventListener("click", async () => {
                const cooldownKey = `like_cd_${post.id}`;
                const lastLiked = localStorage.getItem(cooldownKey);
                const now = Date.now();
                if (lastLiked && (now - lastLiked < 20 * 60 * 1000)) {
                    alert(`Kamu baru saja menyukai ini. Tunggu beberapa saat.`); return;
                }
                try {
                    const res = await fetch('/api/community/posts/like', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId: post.id })
                    });
                    const resData = await res.json();
                    if (resData.success) {
                        likeBtn.querySelector(".like-count").textContent = resData.likes;
                        localStorage.setItem(cooldownKey, now);
                    }
                } catch (e) {}
            });

            card.querySelector(`#viewPost_${post.id}`).addEventListener("click", () => openPostDetail(post));
        });

        loadMoreSection.style.display = allPosts.length > displayedCount ? "block" : "none";
    }

    document.getElementById("btnLoadMore").addEventListener("click", () => { displayedCount += 5; renderPosts(); });

    // CREATE POST
    document.getElementById("btnCreatePost").addEventListener("click", () => {
        if (!currentUser) return document.getElementById("authPopup").classList.add("active");
        
        const lastPosted = localStorage.getItem("last_post_time");
        const now = Date.now();
        if (lastPosted && (now - lastPosted < 10 * 60 * 1000)) {
            alert(`Mendeteksi Spam! Tunggu 10 menit sebelum posting lagi.`); return;
        }

        document.getElementById("createError").style.display = "none";
        document.getElementById("createPostPopup").classList.add("active");
    });

    document.getElementById("btnSubmitPost").addEventListener("click", async () => {
        const title = document.getElementById("postTitleInput").value;
        const description = document.getElementById("postDescInput").value;
        const media = document.getElementById("postMediaInput").value;
        
        if(!title || !description) {
            document.getElementById("createError").style.display = "block";
            document.getElementById("createError").textContent = "Judul dan Deskripsi wajib!";
            return;
        }

        const pass = prompt("Ketik password kamu untuk mengonfirmasi:");
        if(!pass) return;

        try {
            const res = await fetch('/api/community/posts/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: currentUser.username, password: pass, title, description, media })
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem("last_post_time", Date.now());
                document.getElementById("createPostPopup").classList.remove("active");
                document.getElementById("postTitleInput").value = "";
                document.getElementById("postDescInput").value = "";
                document.getElementById("postMediaInput").value = "";
                fetchPosts();
            } else alert(data.message);
        } catch (err) { alert("Error jaringan."); }
    });

    document.getElementById("btnCancelCreate").addEventListener("click", () => document.getElementById("createPostPopup").classList.remove("active"));

    // SISTEM KOMENTAR
    function openPostDetail(post) {
        currentActivePostId = post.id;
        let mediaHTML = "";
        if (post.media) {
            mediaHTML = post.mediaType === "video" ? `<video src="${post.media}" controls class="post-media"></video>` : `<img src="${post.media}" alt="Media" class="post-media">`;
        }

        document.getElementById("postDetailContent").innerHTML = `
            <div class="post-author-row" style="margin-bottom:15px; cursor:pointer;" onclick="window.location.href='profile.html?uid=${post.author.uid}'">
                <img src="${post.author.profilePic}" alt="Ava" class="author-img">
                <div>
                    <div class="author-name">${post.author.displayname}</div>
                    <div class="author-username">@${post.author.username}</div>
                </div>
            </div>
            <h3 style="margin-bottom:10px;">${post.title}</h3>
            <p style="color:#d4d4d4; font-size:14px; margin-bottom:15px; white-space:pre-wrap;">${post.description}</p>
            ${mediaHTML}
        `;
        renderComments(post.comments || []);
        document.getElementById("postDetailPopup").classList.add("active");
    }

    function renderComments(comments) {
        const container = document.getElementById("commentsContainer");
        if(comments.length === 0) {
            container.innerHTML = `<p style="color:var(--text-muted); font-size:12px; text-align:center;">Belum ada komentar.</p>`;
            return;
        }
        container.innerHTML = comments.map(c => `
            <div class="comment-item">
                <span class="comment-author">@${c.username}</span> 
                <span style="color:var(--text-muted); font-size:11px;">${new Date(c.date).toLocaleDateString()}</span>
                <p style="margin-top:5px; color:#e5e5e5;">${c.text}</p>
            </div>
        `).join("");
    }

    document.getElementById("btnSubmitComment").addEventListener("click", async () => {
        if (!currentUser) {
            document.getElementById("postDetailPopup").classList.remove("active");
            return document.getElementById("authPopup").classList.add("active");
        }
        
        const text = document.getElementById("newCommentInput").value;
        if (!text) return;
        
        try {
            const res = await fetch('/api/community/posts/comment', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ postId: currentActivePostId, username: currentUser.username, text })
            });
            const data = await res.json();
            if (data.success) {
                document.getElementById("newCommentInput").value = "";
                fetchPosts(); 
                setTimeout(() => {
                    const updatedPost = allPosts.find(p => p.id === currentActivePostId);
                    if(updatedPost) renderComments(updatedPost.comments);
                }, 500);
            }
        } catch (err) {}
    });

    fetchPosts();
});
