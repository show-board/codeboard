/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      // Mac 风格的圆角、阴影、过渡
      borderRadius: {
        'mac': '12px',
        'mac-lg': '16px',
        'mac-xl': '20px'
      },
      boxShadow: {
        'mac': '0 2px 20px rgba(0,0,0,0.08)',
        'mac-hover': '0 4px 30px rgba(0,0,0,0.12)',
        'mac-modal': '0 10px 60px rgba(0,0,0,0.2)',
        'ribbon': '0 2px 12px rgba(255,255,255,0.3)'
      },
      backdropBlur: {
        'mac': '20px'
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'crack': 'crack 0.4s ease-in-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideInRight: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        crack: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' }
        }
      },
      colors: {
        // Mac 风格的颜色系统
        'mac-bg': 'rgba(246, 246, 246, 1)',
        'mac-sidebar': 'rgba(236, 236, 236, 0.8)',
        'mac-card': 'rgba(255, 255, 255, 0.9)',
        'mac-border': 'rgba(0, 0, 0, 0.06)',
        'mac-text': '#1d1d1f',
        'mac-text-secondary': '#86868b',
        'mac-accent': '#007AFF'
      }
    }
  },
  plugins: []
}
