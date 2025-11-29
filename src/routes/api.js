/**
 * src/routes/api.js
 * Định nghĩa đường dẫn API (Full features: Video, Upload, Like, Playlist...)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer'); // Thư viện upload
const path = require('path');

// Import Controllers
const authCtrl = require('../controllers/authController');
const songCtrl = require('../controllers/songController');
const playCtrl = require('../controllers/playlistController');
const likeCtrl = require('../controllers/likeController'); // <-- Quan trọng: Import Controller Like

// Import Middleware kiểm tra quyền
const { checkUser, checkAdmin } = require('../middleware/auth');

// ============================================================
// CẤU HÌNH UPLOAD FILE (MULTER)
// ============================================================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, 'public/images/');
        } else if (file.mimetype.startsWith('audio/')) {
            cb(null, 'public/music/');
        } 
        // Thêm trường hợp cho Video
        else if (file.mimetype.startsWith('video/')) {
            cb(null, 'public/videos/');
        } else {
            cb(new Error('File không hợp lệ!'), false);
        }
    },
    filename: function (req, file, cb) {
        // Đặt tên file: thời gian hiện tại + tên gốc
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// ============================================================
// 1. AUTHENTICATION (Đăng ký / Đăng nhập)
// ============================================================
router.post('/register', authCtrl.register);
router.post('/login', authCtrl.login);

// ============================================================
// 2. ADMIN: QUẢN LÝ NGƯỜI DÙNG
// ============================================================
router.get('/admin/users', checkAdmin, authCtrl.getAllUsers);
router.delete('/admin/users/:id', checkAdmin, authCtrl.deleteUser);
router.put('/admin/users/lock/:id', checkAdmin, authCtrl.toggleLockUser);

// ============================================================
// 3. QUẢN LÝ NHẠC (SONGS)
// ============================================================
router.get('/songs', songCtrl.getAllSongs);
router.get('/stream/:id', songCtrl.streamSong);
router.get('/stream-video/:id', songCtrl.streamVideo); // API Phát Video

// Admin: Thêm nhạc mới (Có Upload Nhạc, Ảnh, Video)
router.post('/admin/songs/add', 
    checkAdmin, 
    upload.fields([
        { name: 'musicFile', maxCount: 1 }, 
        { name: 'imageFile', maxCount: 1 },
        { name: 'videoFile', maxCount: 1 } 
    ]), 
    songCtrl.addSongAdmin
);

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

module.exports = router;