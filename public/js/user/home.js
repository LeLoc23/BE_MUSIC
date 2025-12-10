import { getAllSongs } from '../api/songService.js';

// --- KHAI BÁO BIẾN (Lấy các thẻ HTML để điều khiển) ---
const audioPlayer = document.getElementById('audioPlayer');
const songListContainer = document.getElementById('songList');

// Các thành phần ở thanh Player dưới đáy
const currentTitle = document.getElementById('currentTitle');
const currentArtist = document.getElementById('currentArtist');
const currentCover = document.getElementById('currentCover');
const mainPlayBtn = document.getElementById('mainPlayBtn'); // Nút Play to ở dưới
const progress = document.getElementById('progress');       // Thanh màu chạy
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');

// Biến lưu trạng thái
let isPlaying = false;
let currentSongList = [];

// --- 1. KHI TRANG WEB VỪA TẢI XONG ---
document.addEventListener('DOMContentLoaded', async () => {
    // Gọi API lấy nhạc
    const songs = await getAllSongs();
    currentSongList = songs;
    
    // Hiển thị ra màn hình
    renderSongs(songs);
});

// --- 2. HÀM HIỂN THỊ DANH SÁCH BÀI HÁT ---
function renderSongs(songs) {
    songListContainer.innerHTML = ''; // Xóa danh sách cũ

    songs.forEach(song => {
        // Tạo thẻ HTML cho từng bài
        const div = document.createElement('div');
        div.className = "group relative bg-transparent rounded-lg overflow-hidden cursor-pointer";
        div.innerHTML = `
            <div class="relative w-full aspect-square rounded-lg overflow-hidden mb-2 shadow-lg">
                <img src="${song.image || 'https://via.placeholder.com/300'}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <button class="play-item-btn w-12 h-12 rounded-full border border-white flex items-center justify-center text-white hover:bg-primary hover:border-primary transition">
                        <i class="fa-solid fa-play ml-1 text-xl"></i>
                    </button>
                </div>
            </div>
            <h3 class="font-bold text-white text-sm truncate hover:text-primary transition">${song.title || song.name}</h3>
            <p class="text-xs text-text-sec mt-1 truncate">${song.artist || 'Unknown'}</p>
        `;

        // Bắt sự kiện click vào bài hát này
        div.addEventListener('click', () => playMusic(song));
        songListContainer.appendChild(div);
    });
}

// --- 3. HÀM PHÁT NHẠC (Logic chính) ---
function playMusic(song) {
    // Cập nhật thông tin thanh Player dưới đáy
    currentTitle.innerText = song.title || song.name;
    currentArtist.innerText = song.artist || 'Unknown';
    currentCover.src = song.image || 'https://via.placeholder.com/300';
    
    // Cập nhật nguồn nhạc và phát (Lưu ý trường song.url hoặc song.link tùy database)
    audioPlayer.src = song.url || song.link; 
    audioPlayer.play();
    
    isPlaying = true;
    updatePlayBtnIcon();
}

// --- 4. XỬ LÝ NÚT PLAY/PAUSE Ở DƯỚI ĐÁY ---
mainPlayBtn.addEventListener('click', () => {
    if (isPlaying) {
        audioPlayer.pause();
    } else {
        audioPlayer.play();
    }
    isPlaying = !isPlaying;
    updatePlayBtnIcon();
});

function updatePlayBtnIcon() {
    if (isPlaying) {
        mainPlayBtn.innerHTML = '<i class="fa-solid fa-pause text-xl"></i>';
    } else {
        mainPlayBtn.innerHTML = '<i class="fa-solid fa-play ml-1 text-xl"></i>';
    }
}

// --- 5. THANH TIẾN TRÌNH (PROGRESS BAR) ---
audioPlayer.addEventListener('timeupdate', (e) => {
    const { duration, currentTime } = e.srcElement;
    
    // Tính phần trăm để chạy thanh màu
    const progressPercent = (currentTime / duration) * 100;
    progress.style.width = `${progressPercent}%`;

    // Cập nhật số phút hiển thị (00:00)
    currentTimeEl.innerText = formatTime(currentTime);
    durationEl.innerText = formatTime(duration);
});

// Hàm format giây thành phút:giây (VD: 125s -> 02:05)
function formatTime(seconds) {
    if (!seconds) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
}