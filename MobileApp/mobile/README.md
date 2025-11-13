# Cardose Mobile App

> React Native + Expo mobile application for business management

## 🎯 Overview

Cross-platform mobile app for managing Premium Gift Box business operations. Built with **React Native** and **Expo** for easy development and deployment.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on Web
npm run web
```

## 📱 Installation Options

### Option 1: Expo Go (Quick Testing)
1. Install **Expo Go** app on your phone
2. Run `npm start`
3. Scan QR code with camera (iOS) or Expo Go (Android)

### Option 2: Build APK/IPA
```bash
# Build Android APK
npm run build:android

# Build iOS IPA
npm run build:ios
```

## 📁 Project Structure

```
mobile/
├── src/
│   ├── screens/               # UI screens
│   │   ├── Dashboard/
│   │   ├── OrderManagement/
│   │   ├── CustomerDatabase/
│   │   ├── Inventory/
│   │   ├── Financial/
│   │   └── Analytics/
│   ├── services/              # Business logic
│   │   ├── OrderService.ts
│   │   ├── CustomerService.ts
│   │   ├── InventoryService.ts
│   │   ├── FinancialService.ts
│   │   └── [...]
│   ├── types/                 # TypeScript definitions
│   │   ├── Order.ts
│   │   ├── Customer.ts
│   │   └── [...]
│   ├── components/            # Reusable components
│   ├── navigation/            # Navigation setup
│   ├── store/                 # Redux store
│   └── theme/                 # UI theming
├── App.tsx                    # Root component
├── app.json                   # Expo configuration
└── package.json
```

## ✨ Features

### Core Modules

1. **Dashboard** 📊
   - Real-time business metrics
   - Order status overview
   - Revenue tracking
   - Quick actions

2. **Order Management** 📦
   - Create/edit orders
   - Workflow tracking (Pending → Completed)
   - Custom specifications
   - Status updates
   - Customer communication

3. **Customer Database** 👥
   - Customer profiles
   - Order history
   - Contact management
   - Communication logs
   - Loyalty tracking

4. **Inventory Management** 📋
   - Stock tracking
   - Reorder alerts
   - Material costs
   - Supplier management
   - Stock movements

5. **Financial Management** 💰
   - Dynamic pricing calculator
   - Invoice generation
   - Payment tracking
   - Profit analysis
   - Expense management

6. **Analytics** 📈
   - Revenue trends
   - Customer insights
   - Sales forecasting
   - Performance KPIs

7. **Production Workflow** 🏭
   - Task assignments
   - Progress tracking
   - Quality control
   - Team coordination

8. **Communication Hub** 📞
   - WhatsApp integration
   - Email management
   - SMS notifications
   - Template library

9. **Design Management** 🎨
   - Design projects
   - File management
   - Version control
   - Approval workflow

## 🛠 Technology Stack

### Core
- **React Native** 0.72 - Mobile framework
- **Expo** 49 - Development platform
- **TypeScript** - Type safety

### State Management
- **Redux Toolkit** - Global state
- **RTK Query** - API calls
- **React Redux** - React bindings

### Navigation
- **React Navigation 6** - Navigation library
- Stack Navigator
- Bottom Tabs Navigator

### UI Components
- **React Native Paper** - Material Design
- **React Native Chart Kit** - Charts/graphs
- **Expo Icons** - Icon library

### Data & Storage
- **Expo SQLite** - Local database
- **Expo File System** - File management
- **Redux Persist** - State persistence

### Forms & Validation
- **React Hook Form** - Form management
- **Yup** - Schema validation

### Other
- **date-fns** - Date manipulation
- **Expo Camera** - Camera access
- **Expo Image Picker** - Image selection

## ⚙️ Configuration

### Backend Connection

Update API URL in `src/config.ts`:

```typescript
export const API_URL = 'http://192.168.1.x:3000/api';
```

### App Configuration

Edit `app.json`:

```json
{
  "expo": {
    "name": "Cardose",
    "slug": "cardose",
    "version": "1.0.0",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png"
    }
  }
}
```

## 📲 Development

### Hot Reload
Changes automatically reload during development

### Debug Menu
- **Android**: Shake device or `adb shell input keyevent 82`
- **iOS**: Shake device or `⌘D`

### React DevTools
```bash
npx react-devtools
```

### Redux DevTools
Built-in Redux DevTools integration

## 🏗 Building for Production

### Android APK

```bash
# Using EAS Build (recommended)
npm install -g eas-cli
eas build --platform android --profile production

# Or classic build
expo build:android
```

### iOS IPA

```bash
# Requires Apple Developer account
eas build --platform ios --profile production
```

### Configuration

Create `eas.json`:

```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

## 📦 Features in Detail

### Offline-First Architecture
- Local SQLite database
- Background sync when online
- Offline mode indicators
- Conflict resolution

### Real-Time Updates
- WebSocket connections
- Live order status
- Push notifications
- Auto-refresh data

### Security
- JWT authentication
- Role-based access
- Encrypted local storage
- Secure API communication

### Indonesian Market Features
- SAK ETAP accounting
- Islamic calendar
- Local tax calculations (PPN, PPh)
- Indonesian language support
- Rupiah (IDR) currency

## 🎨 Theming

### Custom Theme

Edit `src/theme/theme.ts`:

```typescript
export const theme = {
  colors: {
    primary: '#1e0d04',    // Brown
    accent: '#f1d886',     // Gold
    background: '#ffffff'
  },
  fonts: {
    regular: 'Inter',
    display: 'Playfair Display'
  }
};
```

## 🐛 Troubleshooting

### Metro Bundler Issues
```bash
npx expo start --clear
```

### Android Build Errors
```bash
cd android
./gradlew clean
cd ..
npm start
```

### iOS Build Errors
```bash
cd ios
pod install
cd ..
npm start
```

### Network Connection Issues
- Ensure phone and computer on same WiFi
- Check firewall settings
- Use `exp://192.168.1.x:19000` format

## 📊 Performance

### Optimization Tips
- Use `React.memo()` for expensive components
- Implement `FlatList` for long lists
- Lazy load images
- Minimize re-renders
- Use Redux selectors efficiently

### Bundle Size
- Tree-shaking enabled
- Remove unused dependencies
- Optimize images

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### E2E Tests
```bash
npm run test:e2e
```

### Manual Testing Checklist
- [ ] Login/logout flow
- [ ] Create/edit/delete operations
- [ ] Offline mode
- [ ] Sync functionality
- [ ] Image upload
- [ ] PDF generation
- [ ] Push notifications

## 📱 Permissions Required

### Android
- Camera
- Storage (read/write)
- Internet
- Network state

### iOS
- Camera
- Photo Library
- Notifications

## 🚀 Deployment

### Internal Distribution
1. Build APK/IPA
2. Share file directly
3. Install on devices

### Play Store (Android)
1. Create developer account
2. Build signed APK
3. Upload to Play Console
4. Submit for review

### App Store (iOS)
1. Apple Developer account ($99/year)
2. Build with eas-cli
3. Upload to App Store Connect
4. Submit for review

## 📈 Analytics Integration

Track user behavior and app performance:

```typescript
import Analytics from '@/services/AnalyticsService';

// Track events
Analytics.trackEvent('order_created', {
  orderId: '123',
  amount: 500000
});
```

## 🔄 Update Strategy

### Over-the-Air (OTA) Updates
```bash
expo publish
```

Users get updates automatically without re-downloading app.

### App Store Updates
Required for:
- Native code changes
- New permissions
- Major version updates

## 📞 Support

For mobile app issues:
1. Check Expo documentation
2. Review React Native guides
3. Test on different devices
4. Check console logs

---

**Mobile App Ready! 📱**

