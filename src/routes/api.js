/**
 * src/routes/api.js
 * FINAL VERSION: Auth (User+History), Songs, Playlist, Likes, Stats, AI Search
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Import Controllers
const authCtrl = require('../controllers/authController'); // Chứa: User, Auth, History
const songCtrl = require('../controllers/songController');
const playCtrl = require('../controllers/playlistController');
const likeCtrl = require('../controllers/likeController');
const statsCtrl = require('../controllers/statsController');
const aiCtrl = require('../controllers/aiController'); // Chứa: AI Search

// Import Middleware
const { checkUser, checkAdmin, checkManager } = require('../middleware/auth');

// --- CẤU HÌNH UPLOAD ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) cb(null, 'public/images/');
        else if (file.mimetype.startsWith('audio/')) cb(null, 'public/music/');
        else if (file.mimetype.startsWith('video/')) cb(null, 'public/videos/');
        else cb(new Error('File không hợp lệ!'), false);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// ============================================================
// 1. AUTHENTICATION (Đăng ký, Đăng nhập, Đổi mật khẩu)
// ============================================================
router.post('/register', authCtrl.register);
router.post('/login', authCtrl.login);
router.post('/change-password', authCtrl.changePassword);

// ============================================================
// 2. ADMIN USER (Chỉ Admin tối cao)
// ============================================================
router.get('/admin/users', checkAdmin, authCtrl.getAllUsers);
router.delete('/admin/users/:id', checkAdmin, authCtrl.deleteUser);
router.put('/admin/users/lock/:id', checkAdmin, authCtrl.toggleLockUser);
router.put('/admin/users/role/:id', checkAdmin, authCtrl.updateUserRole);

// ============================================================
// 3. QUẢN LÝ NHẠC (SONGS)
// ============================================================
router.get('/songs', songCtrl.getAllSongs);
router.get('/stream/:id', songCtrl.streamSong);
router.get('/stream-video/:id', songCtrl.streamVideo);

// Thêm nhạc (Manager/Admin)
router.post('/admin/songs/add', 
    checkManager, 
    upload.fields([{ name: 'musicFile', maxCount: 1 }, { name: 'imageFile', maxCount: 1 }, { name: 'videoFile', maxCount: 1 }]), 
    songCtrl.addSongAdmin
);

// Sửa nhạc (Manager/Admin)
router.put('/admin/songs/update/:id', checkManager, songCtrl.updateSongAdmin);

// Ẩn/Hiện nhạc (Manager/Admin)
router.put('/admin/songs/hide/:id', checkManager, songCtrl.toggleHideSong);

// Xóa nhạc vĩnh viễn (Chỉ Admin)
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
// 5. LỊCH SỬ NGHE NHẠC (Dùng authCtrl)
// ============================================================
router.get('/user/history', checkUser, authCtrl.getHistory);
router.post('/user/history/add', checkUser, authCtrl.addToHistory);

// ============================================================
// 6. YÊU THÍCH (LIKES)
// ============================================================
router.post('/user/likes/toggle', checkUser, likeCtrl.toggleLike);
router.get('/user/likes', checkUser, likeCtrl.getLikedSongs);
router.get('/user/likes/ids', checkUser, likeCtrl.getLikedIds);

// ============================================================
// 7. BÁO CÁO THỐNG KÊ (Manager/Admin)
// ============================================================
router.post('/songs/listen/:id', statsCtrl.incrementListenCount);
router.get('/admin/stats/general', checkManager, statsCtrl.getGeneralStats);
router.get('/admin/stats/top-listen', checkManager, statsCtrl.getTopListened);
router.get('/admin/stats/top-like', checkManager, statsCtrl.getTopLiked);

// ============================================================
// 8. TÌM KIẾM AI (AI Search)
// ============================================================
// Giữ lại tính năng này theo yêu cầu của bạn
router.post('/ai/search', aiCtrl.searchByEmotion);

module.exports = router;