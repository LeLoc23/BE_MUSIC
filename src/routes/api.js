/**
 * src/routes/api.js
 * ĐỊNH NGHĨA ROUTE API (Phiên bản đầy đủ: Phân quyền Admin/Manager/User)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Import Controllers
const authCtrl = require('../controllers/authController');
const songCtrl = require('../controllers/songController');
const playCtrl = require('../controllers/playlistController');
const likeCtrl = require('../controllers/likeController');
const statsCtrl = require('../controllers/statsController');

// Import Middleware (Đảm bảo file auth.js đã có hàm checkManager)
const { checkUser, checkAdmin, checkManager } = require('../middleware/auth');

// ============================================================
// CẤU HÌNH UPLOAD FILE (MULTER)
// ============================================================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, 'public/images/');
        } else if (file.mimetype.startsWith('audio/')) {
            cb(null, 'public/music/');
        } else if (file.mimetype.startsWith('video/')) {
            cb(null, 'public/videos/');
        } else {
            cb(new Error('File không hợp lệ!'), false);
        }
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// ============================================================
// 1. AUTHENTICATION
// ============================================================
router.post('/register', authCtrl.register);
router.post('/login', authCtrl.login);

// ============================================================
// 2. ADMIN: QUẢN LÝ NGƯỜI DÙNG (CHỈ ADMIN TỐI CAO)
// ============================================================
router.get('/admin/users', checkAdmin, authCtrl.getAllUsers);
router.delete('/admin/users/:id', checkAdmin, authCtrl.deleteUser);
router.put('/admin/users/lock/:id', checkAdmin, authCtrl.toggleLockUser);

// Cấp quyền Manager
router.put('/admin/users/role/:id', checkAdmin, authCtrl.updateUserRole);

// ============================================================
// 3. QUẢN LÝ NHẠC (MANAGER & ADMIN)
// ============================================================
// Lấy danh sách nhạc
router.get('/songs', songCtrl.getAllSongs);

// Phát nhạc & Video
router.get('/stream/:id', songCtrl.streamSong);
router.get('/stream-video/:id', songCtrl.streamVideo);

// Thêm nhạc mới: Manager được phép làm
router.post('/admin/songs/add', 
    checkManager, 
    upload.fields([
        { name: 'musicFile', maxCount: 1 }, 
        { name: 'imageFile', maxCount: 1 },
        { name: 'videoFile', maxCount: 1 } 
    ]), 
    songCtrl.addSongAdmin
);

// Cập nhật thông tin nhạc: Manager được phép làm
router.put('/admin/songs/update/:id', checkManager, songCtrl.updateSongAdmin);

// Ẩn / Hiện nhạc: Manager được phép làm
router.put('/admin/songs/hide/:id', checkManager, songCtrl.toggleHideSong);

// Xóa nhạc vĩnh viễn: CHỈ ADMIN (Để an toàn tuyệt đối)
router.delete('/admin/songs/:id', checkAdmin, songCtrl.deleteSong);

// ============================================================
// 4. QUẢN LÝ PLAYLIST
// ============================================================
router.get('/user/playlists', checkUser, playCtrl.getUserPlaylists);
router.get('/user/playlists/:id', checkUser, playCtrl.getPlaylistDetail);
router.post('/user/playlists/create', checkUser, playCtrl.createPlaylist);
router.post('/user/playlists/add-song', checkUser, playCtrl.addSongToPlaylist);
router.delete('/user/playlists/delete/:id', checkUser, playCtrl.deletePlaylist);
router.delete('/user/playlists/remove-song', checkUser, playCtrl.removeSongFromPlaylist);

// ============================================================
// 5. LỊCH SỬ NGHE NHẠC
// ============================================================
router.get('/user/history', checkUser, playCtrl.getHistory);
router.post('/user/history/add', checkUser, playCtrl.addToHistory);

// ============================================================
// 6. YÊU THÍCH (LIKES)
// ============================================================
router.post('/user/likes/toggle', checkUser, likeCtrl.toggleLike);
router.get('/user/likes', checkUser, likeCtrl.getLikedSongs);
router.get('/user/likes/ids', checkUser, likeCtrl.getLikedIds);

// ============================================================
// 7. BÁO CÁO THỐNG KÊ (MANAGER & ADMIN)
// ============================================================
// Tăng lượt nghe (Ai cũng gọi được khi play)
router.post('/songs/listen/:id', statsCtrl.incrementListenCount);

// Xem báo cáo: Manager được phép xem
router.get('/admin/stats/general', checkManager, statsCtrl.getGeneralStats);
router.get('/admin/stats/top-listen', checkManager, statsCtrl.getTopListened);
router.get('/admin/stats/top-like', checkManager, statsCtrl.getTopLiked);

module.exports = router;