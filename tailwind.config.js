/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        'main-bg': '#170f23',      // Màu nền chính (Tối sẫm)
        'sidebar-bg': '#231b2e',   // Màu nền thanh bên
        'player-bg': '#130c1c',    // Màu nền thanh phát nhạc
        'primary': '#9b4de0',      // Màu tím chủ đạo (Nút, Hover)
        'text-sec': '#dadada',     // Màu chữ phụ
        'hover-item': '#ffffff1a'  // Màu khi di chuột vào menu
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Font chữ hiện đại
      }
    },
  },
  plugins: [],
}