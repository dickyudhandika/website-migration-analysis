# Website Migration Analysis Tool

A powerful web application that helps you analyze and compare website migrations by examining internal and external links between old and new websites.

## 🌟 Features

### Migration Success Analysis
- **Percentage Similarity**: Calculate how much of your old website was successfully migrated
- **Color-Coded Results**: Visual indicators for migration success rates
  - 🟢 Green (80%+): High success rate
  - 🟡 Orange (60-79%): Medium success rate
  - 🔴 Red (<60%): Low success rate

### Comprehensive Link Analysis
- **Detailed Link Information**: URL, anchor text, link type, and follow status
- **Missing Link Detection**: Identify links from the old site that weren't migrated
- **Internal vs External**: Separate analysis of internal and external links
- **Follow/NoFollow Status**: Track SEO-relevant link attributes

### User-Friendly Interface
- **Modern Design**: Clean, responsive interface with beautiful gradients
- **Mobile Responsive**: Works perfectly on desktop, tablet, and mobile devices
- **Real-time Analysis**: Instant results with loading states
- **Error Handling**: Clear error messages for troubleshooting

## 🚀 Live Demo

[Deploy your own instance on Vercel](#deployment)

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: CSS Modules with modern design
- **Web Crawling**: Axios, Cheerio for HTML parsing
- **Deployment**: Vercel (recommended)

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

## 🏃‍♂️ Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd website-migration-analysis
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## 📖 How to Use

1. **Enter URLs**: 
   - Old Website: Your original website URL
   - New Website: Your migrated website URL

2. **Analyze Migration**: Click "Analyze Migration" to start the comparison

3. **Review Results**:
   - Check the migration success rate percentage
   - Examine missing links that need attention
   - Compare link structures between old and new sites

4. **Take Action**: Use the missing links list to improve your new website

## 🔧 API Endpoints

### POST /api/compare
Compares two websites and returns detailed link analysis.

**Request Body:**
```json
{
  "url1": "https://old-website.com",
  "url2": "https://new-website.com"
}
```

**Response:**
```json
{
  "url1": {
    "internalLinks": [...],
    "externalLinks": [...]
  },
  "url2": {
    "internalLinks": [...],
    "externalLinks": [...]
  },
  "shared": {
    "internalLinks": [...],
    "externalLinks": [...]
  }
}
```

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/website-migration-analysis.git
   git push -u origin main
   ```

2. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with your GitHub account
   - Click "New Project"
   - Import your repository
   - Deploy!

### Environment Variables

No environment variables required for basic functionality.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with Next.js and React
- Styled with modern CSS
- Deployed on Vercel

## 📞 Support

If you have any questions or need help, please open an issue on GitHub.

---

**Happy migrating! 🚀**
