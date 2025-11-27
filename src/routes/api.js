const express = require('express');
const router = express.Router();

// Import Controllers & Middleware
const authCtrl = require('../controllers/authController');
const songCtrl = require('../controllers/songController');
const playCtrl = require('../controllers/playlistController');
const { checkUser, checkAdmin } = require('../middleware/auth');

// --- AUTH ---
router.post('/register', authCtrl.register);
router.post('/login', authCtrl.login);

// --- SONGS ---
router.get('/songs', songCtrl.getAllSongs);
router.get('/stream/:id', songCtrl.streamSong);
router.post('/admin/songs/add', checkAdmin, songCtrl.addSongAdmin);

// --- PLAYLISTS ---
router.get('/user/playlists', checkUser, playCtrl.getUserPlaylists);
router.get('/user/playlists/:id', checkUser, playCtrl.getPlaylistDetail);
router.post('/user/playlists/create', checkUser, playCtrl.createPlaylist);
router.post('/user/playlists/add-song', checkUser, playCtrl.addSongToPlaylist);
router.delete('/user/playlists/delete/:id', checkUser, playCtrl.deletePlaylist);
router.delete('/user/playlists/remove-song', checkUser, playCtrl.removeSongFromPlaylist);

// --- HISTORY ---
router.get('/user/history', checkUser, playCtrl.getHistory);
router.post('/user/history/add', checkUser, playCtrl.addToHistory);

// Admin User List
const db = require('../config/database');
router.get('/admin/users', checkAdmin, (req, res) => {
    db.all("SELECT id, username, role FROM users", [], (err, rows) => res.json({ data: rows }));
});

module.exports = router;