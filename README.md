# 台灣宗教地圖 (Taiwan Religious Sites Map)

An interactive web application for exploring religious sites across Taiwan, featuring temples, churches, and other sacred places with detailed information and modern web technologies.

## 🌟 Features

### Core Functionality
- **Interactive Map**: Explore religious sites across Taiwan with modern Leaflet-based mapping
- **Cluster Visualization**: Intelligent clustering for better performance with large datasets
- **County-based Navigation**: Browse by administrative regions with boundary highlighting
- **Search & Filter**: Find specific sites or filter by deity/religious figure
- **Detailed Information**: Comprehensive data for each religious site including photos
- **Responsive Design**: Optimized for desktop and mobile devices

### Technical Features
- **Progressive Web App (PWA)**: Offline support and app-like experience
- **Sacred Theme Design**: Beautiful golden/purple color scheme with religious aesthetics
- **Performance Optimized**: Lazy loading, chunked processing, and efficient clustering
- **Modern UI**: Bootstrap 5 with custom sacred styling and popup-based interactions
- **SEO Optimized**: Proper meta tags and Open Graph integration

## 🚀 Live Demo

Visit the live application: [https://kiang.github.io/religions/](https://kiang.github.io/religions/)

## 🛠️ Technology Stack

### Frontend
- **Mapping**: Leaflet 1.9.4 with MarkerCluster plugin
- **UI Framework**: Bootstrap 5.0.0
- **Fonts**: Noto Serif TC, Noto Sans TC (Google Fonts)
- **Icons**: Font Awesome 4.1.0
- **JavaScript**: Vanilla ES5 for maximum compatibility
- **CSS**: Custom sacred theme with CSS variables

### Data & APIs
- **Map Data**: TopoJSON for Taiwan administrative boundaries
- **Religious Sites**: JSON data from government sources
- **Photos**: Google Drive integration for site images
- **Base Maps**: Taiwan National Land Surveying and Mapping Center

### Build & Deployment
- **Hosting**: GitHub Pages
- **Service Worker**: Custom PWA implementation with aggressive caching
- **Version Control**: Git with detailed commit history

## 📁 Project Structure

```
religions/
├── index.html              # Main application file
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker for offline support
├── js/
│   ├── main_leaflet.js     # Core Leaflet application logic
│   ├── main.js             # Legacy OpenLayers code (deprecated)
│   ├── jquery.min.js       # jQuery library
│   └── routie.min.js       # Client-side routing
├── icon-192x192.png        # PWA icon (192x192)
├── icon-512x512.png        # PWA icon (512x512)
└── README.md              # This file
```

## 🎨 Design System

### Color Palette
- **Primary Gold**: `#D4AF37` - Sacred golden color for primary elements
- **Deep Gold**: `#B8860B` - Darker gold for accents and borders
- **Sacred Purple**: `#6B46C1` - Complementary purple for variety
- **Warm White**: `#FEFCF8` - Off-white background for comfort
- **Photo Gold**: `#FFD700` - Special highlighting for sites with photos

### Typography
- **Headers**: Noto Serif TC (Traditional Chinese serif)
- **Body Text**: Noto Sans TC (Traditional Chinese sans-serif)
- **UI Elements**: System fonts fallback for performance

### Components
- **Sacred FAB**: Floating action button with gradient and glow effects
- **Modal Popups**: Bootstrap modals with custom sacred styling
- **Marker Clusters**: Custom SVG-based cluster icons with religious symbolism
- **County Boundaries**: Highlighted administrative regions with sacred colors

## 📊 Data Sources

1. **Internal Affairs Religious Affairs System** - Official government database
2. **County Government Open Data** - Local government records
3. **Community Contributions** - User-submitted photos and information
4. **Taiwan Administrative Boundaries** - TopoJSON from taiwan_basecode project

## 🔧 Installation & Development

### Prerequisites
- Modern web browser with ES5+ support
- Web server for local development (due to CORS restrictions)

### Local Development
```bash
# Clone the repository
git clone https://github.com/kiang/religions.git
cd religions

# Serve with any web server, for example:
python -m http.server 8000
# or
npx serve .

# Open browser to http://localhost:8000
```

### Deployment
The application is designed for static hosting:

1. **GitHub Pages**: Automatic deployment from main branch
2. **CDN/Static Hosting**: Upload all files to any static host
3. **Service Worker**: Automatically provides offline support

## 🚀 Performance Optimizations

### Mapping Performance
- **Marker Clustering**: Reduces DOM elements for large datasets
- **Lazy Loading**: Markers loaded in chunks to prevent UI blocking
- **Simplified Icons**: CSS-based markers instead of complex SVG
- **Boundary Caching**: Administrative boundaries cached for repeat visits

### Loading Performance
- **Service Worker**: Aggressive caching of static resources
- **CDN Resources**: External libraries loaded from CDN
- **Progressive Enhancement**: Core functionality works without JavaScript
- **Optimized Images**: Properly sized icons and images

### User Experience
- **Persistent Selection**: Markers stay highlighted after popup closes
- **No Auto-centering**: Map position preserved during interactions
- **Responsive Design**: Optimized for all device sizes
- **Offline Support**: Core functionality available without internet

## 🎯 User Journey

1. **Landing**: User sees Taiwan map with county boundaries and labels
2. **County Selection**: Click county to load religious sites
3. **Site Exploration**: Clustered markers show density
4. **Detail View**: Click marker to see detailed information
5. **External Actions**: Navigate to site or view more details

### Key Interactions
- **County Click**: Loads and displays religious sites for that county
- **Marker Click**: Shows popup with site details and actions
- **Map Click**: Clears selected marker highlighting
- **Search**: Filter sites by deity or religious figure
- **Navigation**: External links to Google Maps, detailed pages

## 🔐 Privacy & Security

- **No User Tracking**: Removed Facebook SDK and tracking
- **External Links**: Clear indication of external navigation
- **Secure Connections**: All resources loaded over HTTPS
- **Local Storage**: Only used for service worker caching
- **Data Protection**: No personal information collected

## 🌍 Internationalization

- **Primary Language**: Traditional Chinese (Taiwan)
- **Character Encoding**: UTF-8 throughout
- **Religious Terms**: Proper traditional Chinese religious terminology
- **Cultural Sensitivity**: Respectful representation of all religions

## 📱 Progressive Web App Features

- **Installable**: Can be installed as app on mobile devices
- **Offline Support**: Core functionality works without internet
- **App Icons**: Proper icons for home screen installation
- **Theme Colors**: Custom theme colors for OS integration
- **Service Worker**: Advanced caching strategies

## 🤝 Contributing

### Code Contributions
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Data Contributions
- **Photo Submissions**: Use the built-in Google Form integration
- **Site Information**: Report corrections or additions via issues
- **Translation**: Help improve Chinese terminology

### Bug Reports
Please include:
- Browser and version
- Device type and OS
- Steps to reproduce
- Expected vs actual behavior
- Console errors (if any)

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 👥 Credits

### Development
- **Created by**: 江明宗 (Kiang)
- **Enhanced with**: Claude Code assistance
- **Inspiration**: Taiwan's rich religious heritage

### Data Sources
- Internal Affairs Religious Affairs System
- Taiwan county governments
- Community contributors
- Open source mapping projects

### Technology
- Leaflet mapping library
- Bootstrap UI framework
- Font Awesome icons
- Google Fonts typography

## 📞 Contact

- **Website**: [https://kiang.github.io/religions/](https://kiang.github.io/religions/)
- **Facebook**: [https://facebook.com/k.olc.tw/](https://facebook.com/k.olc.tw/)
- **Issues**: [GitHub Issues](https://github.com/kiang/religions/issues)

## 🔄 Version History

### v2.x (Current - Leaflet)
- Modern Leaflet-based mapping
- Sacred theme design system
- Progressive Web App features
- Performance optimizations
- Mobile-first responsive design

### v1.x (Legacy - OpenLayers)
- Original OpenLayers implementation
- Basic sidebar navigation
- Simple marker system

---

**Made with ❤️ for Taiwan's religious heritage preservation**