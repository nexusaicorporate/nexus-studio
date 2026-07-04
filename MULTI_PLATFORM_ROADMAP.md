# Nexus AI Studio — Multi-Platform & Website Roadmap

## Platform Strategy Overview

### Current State (Today)
- ✓ Web SaaS running on Ubuntu 26.04
- ✓ Application deployed (http://47.236.51.230:3000)
- ✓ Database configured (PostgreSQL + Prisma)
- ✓ API backend operational

### Target State (Month 18)
- ✓ Web SaaS (mature)
- ✓ Windows & Mac packaged apps (revenue-generating)
- ✓ iOS app (Apple App Store)
- ✓ Android app (Google Play Store)
- ✓ Marketing website (nexusaigear.com)
- ✓ Mobile-optimized experience
- ✓ Multi-platform revenue: $773K ARR

---

## 1. WEBSITE (nexusaigear.com)

### Purpose
- Marketing funnel entry point
- SEO-driven organic discovery
- Product showcase & free tier signup
- Blog & educational content
- Pricing & feature comparison
- App store links

### Timeline: Weeks 1-4

#### Week 1 (This Week!)
**Goal**: Basic landing page live

**Tasks**:
- [ ] Domain registration (nexusaigear.com)
- [ ] Hosting setup (Vercel recommended)
- [ ] Next.js landing page template
  - Hero section (problem statement)
  - Feature showcase (3-4 gears)
  - Pricing tiers (with visual comparison)
  - "Get Started Free" CTA
  - Footer (download links)
- [ ] "Sign Up Free" → links to http://47.236.51.230:3000
- [ ] Basic SEO setup (meta tags, sitemap)

**Owner**: Founder + Designer (contractor)  
**Tools**: Next.js 14, Vercel deployment, Tailwind CSS  
**Time**: 3-4 days  

**Deliverable**: https://nexusaigear.com live with signup funnel

#### Week 2-3
**Goal**: Feature-complete website

**Tasks**:
- [ ] Blog system (Markdown-based)
  - 5 initial posts (tutorials, comparisons)
- [ ] Feature deep-dive pages
  - /features/chat-gear
  - /features/image-studio
  - /features/video-studio
  - /features/cinema
  - /features/character
  - /features/ugc-ads
  - /features/comfyui
- [ ] Pricing page with feature matrix
- [ ] FAQ section (common questions)
- [ ] "Why Nexus" comparison (vs MidJourney, Runway, Leonardo)
- [ ] Analytics (Vercel Analytics, Plausible)
- [ ] Email capture for waitlist

**Owner**: Designer (contractor) + Founder  
**Time**: 4-5 days  

#### Week 4
**Goal**: Marketing optimization

**Tasks**:
- [ ] SEO optimization (keyword research, meta descriptions)
- [ ] Performance optimization (PageSpeed Insights 90+)
- [ ] Mobile responsiveness testing
- [ ] Email sequence for signups (3-email welcome series)
- [ ] Social media previews (OG tags, Twitter cards)

**Owner**: Founder  
**Time**: 2-3 days

### Website Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Hosting**: Vercel (free tier or pro)
- **Database**: Postgres (optional, for blog)
- **Styling**: Tailwind CSS
- **Analytics**: Vercel Analytics + Plausible
- **Email**: Resend or SendGrid
- **CDN**: Vercel Edge Network (auto)

### Website Cost
- Domain: $10/year
- Hosting: $0-20/month (Vercel free tier)
- Email service: $0-50/month
- **Total Year 1**: ~$200-300

---

## 2. DESKTOP PACKAGED APP (Windows & Mac)

### Strategy
Tauri-based apps packaged as standalone executables  
BYO API keys (no server auth)  
Offline capabilities (local LLM)  
Distribution: Direct download + App Stores

### Pricing
- **Free**: Limited features (chat only, 50 req/day)
- **Pro**: $20/month subscription (all features) OR $49 one-time
- **Studio**: $40/month subscription (unlimited) OR $99 one-time

### Timeline: Weeks 3-12

#### Phase 1: Windows Build (Weeks 3-6)
**Goal**: Windows .exe installer

**Tasks**:
- [ ] Tauri project setup
- [ ] Bundle existing React app into Tauri container
- [ ] Offline AI integration (Qwen 1.5B model)
- [ ] Local storage for API keys
- [ ] File upload/download handlers
- [ ] Windows-specific UI tweaks
- [ ] Code signing (self-signed initially)
- [ ] Installer creation (NSIS)
- [ ] Testing on Windows 10/11
- [ ] Github Releases setup for downloads

**Owner**: Full-Stack Engineer + Founder  
**Time**: 2 weeks  
**Output**: nexus-studio-win-1.0.0.exe (50-80 MB)

#### Phase 2: macOS Build (Weeks 5-8)
**Goal**: macOS .dmg installer

**Tasks**:
- [ ] Tauri macOS configuration
- [ ] Apple certificate setup (Developer ID)
- [ ] Code signing & notarization process
- [ ] DMG package creation
- [ ] Testing on macOS 12+ (Intel + Apple Silicon)
- [ ] M1/M2 optimization
- [ ] Release to Github

**Owner**: Full-Stack Engineer  
**Time**: 2 weeks  
**Output**: nexus-studio-mac-1.0.0.dmg (50-80 MB)

#### Phase 3: Distribution (Weeks 9-12)
**Goal**: Listed in app stores + direct download

**Tasks**:
- [ ] Windows Store submission
  - Prepare screenshots, description
  - Upload to Microsoft Store
  - Pricing setup ($20/$40/month)
- [ ] Mac App Store submission
  - App review process
  - Pricing setup
- [ ] Direct download site
  - Landing page: https://nexusaigear.com/download
  - Version history
  - Release notes
- [ ] Update checker in app
- [ ] Analytics (crash reporting, usage tracking)

**Owner**: Founder + Contractor  
**Time**: 2 weeks  

### Desktop App Tech Stack
- **Framework**: Tauri 2.0
- **UI**: React (reuse existing)
- **Storage**: SQLite (local)
- **Local AI**: Qwen 2 1.5B (from Ollama or Transformers.js)
- **Signing**: Self-signed (Windows), Developer ID (macOS)
- **Distribution**: Github Releases, Windows Store, Mac App Store

### Desktop App Revenue Model
**Month 12 Projection**: 240 paid users = $7,200/month
- 100 paying with Pro ($20/mo) = $2,000/mo
- 140 paying with Studio ($40/mo) = $5,600/mo
- Plus one-time purchases (assume 20% of monthly): $1,440/mo
- **Total: $9,040/month expected**

---

## 3. MOBILE APPS (iOS & Android)

### Strategy
React Native (Expo) for code sharing  
Same pricing as web (Pro $30, Studio $50)  
Offline chat + lightweight features  
Push notifications for engagement  

### Timeline: Weeks 6-18

#### Phase 1: Project Setup & MVP (Weeks 6-10)
**Goal**: iOS & Android beta builds

**Tasks**:
- [ ] React Native project initialization (Expo)
- [ ] Authentication flow (same NextAuth)
- [ ] Core features (Chat, Image generation)
- [ ] Bottom tab navigation (Chat, Image, Settings)
- [ ] Dark mode support
- [ ] Offline support (local storage)
- [ ] Push notification setup (Firebase Cloud Messaging)
- [ ] Testing on physical devices

**Owner**: Mobile Engineer (hire) + Full-Stack  
**Time**: 3 weeks  
**Deliverable**: Testable APK/IPA

#### Phase 2: Feature Expansion (Weeks 11-14)
**Goal**: Feature parity with web

**Tasks**:
- [ ] Video preview feature (mobile-optimized)
- [ ] Character design (simplified UI)
- [ ] UGC Ads gear (quick generation)
- [ ] Image gallery (download, share)
- [ ] Settings & account management
- [ ] In-app purchase integration (RevenueCat)
- [ ] Analytics (Mixpanel, Firebase)
- [ ] Performance optimization (App startup <2s)

**Owner**: Mobile Engineer  
**Time**: 3 weeks  

#### Phase 3: App Store Submission (Weeks 15-18)
**Goal**: Live on App Store & Play Store

**Tasks**:
- **iOS**:
  - [ ] Apple Developer account ($99/year)
  - [ ] App review preparation (screenshots, description, privacy policy)
  - [ ] In-app purchase setup (Pro $30, Studio $50)
  - [ ] TestFlight beta (external)
  - [ ] App Store submission
  - [ ] Review & approval (1-3 weeks)
  
- **Android**:
  - [ ] Google Play Developer account ($25 one-time)
  - [ ] Google Play Console setup
  - [ ] In-app purchase configuration
  - [ ] Beta testing (internal + closed)
  - [ ] Production release
  - [ ] Review & approval (typically 1-2 hours)

**Owner**: Founder + Mobile Engineer  
**Time**: 2-3 weeks  

### Mobile Tech Stack
- **Framework**: React Native (Expo)
- **State**: Redux or Zustand
- **Storage**: AsyncStorage + SQLite
- **Auth**: NextAuth (web) + custom mobile auth
- **Push**: Firebase Cloud Messaging
- **Analytics**: Mixpanel + Firebase Analytics
- **In-App Purchase**: RevenueCat (handles both iOS/Android)
- **Deployment**: EAS (Expo Application Services)

### Mobile Revenue Model
**Month 12 Projection**: 300 paid users across iOS/Android
- iOS: 180 Pro ($30) + 60 Studio ($50) = $8,400/mo
- Android: 100 Pro ($30) + 35 Studio ($50) = $4,350/mo
- In-app purchases (credits): +$2,000/mo
- **Total: $14,750/month expected**

---

## 4. LIVE SERVER APP (Current)

### Status
✓ Web app running on http://47.236.51.230:3000  
✓ All gears operational  
✓ Database connected  
✓ Ready for production

### Week 1 Launch Checklist (THIS WEEK)

#### Monday-Tuesday
- [ ] Setup CI/CD pipeline (GitHub Actions)
- [ ] Configure SSL/TLS (Cloudflare Tunnel)
- [ ] Backup strategy (daily DB backups)
- [ ] Error tracking (Sentry)
- [ ] Logging setup (structured JSON logs)
- [ ] Status page (https://status.nexusaigear.com)

#### Wednesday
- [ ] Launch announcement blog post
- [ ] Email to early adopters
- [ ] Twitter/X announcement
- [ ] ProductHunt announcement prep

#### Thursday-Friday
- [ ] Launch week support on Discord
- [ ] Monitor uptime & performance
- [ ] Collect early user feedback
- [ ] Bug fixes based on real usage

**Owner**: Founder + DevOps  
**Target**: Live and stable by Friday EOD

---

## INTEGRATED TIMELINE (Week-by-Week)

```
WEEK 1 (NOW):
├─ Server App: LAUNCH (Friday EOD)
├─ Website: Week 1 tasks (landing page)
├─ Desktop: Project setup (Tauri)
└─ Mobile: Planning & setup

WEEK 2:
├─ Server App: Monitor, iterate, bug fixes
├─ Website: Week 2 tasks (feature pages)
├─ Desktop: Windows build (WIP)
└─ Mobile: Expo project setup

WEEK 3:
├─ Server App: Stable, feature validation
├─ Website: Week 3 tasks (optimization)
├─ Desktop: Windows build + macOS start
└─ Mobile: Core features development

WEEK 4:
├─ Server App: Ready for investors
├─ Website: LIVE (nexusaigear.com)
├─ Desktop: macOS build, distribution start
└─ Mobile: Feature expansion

WEEK 6:
├─ Desktop: Distribution channels (App Stores)
└─ Mobile: MVP build ready

WEEK 12:
├─ Desktop: LIVE (Windows Store, Mac App Store)
└─ Mobile: MVP complete

WEEK 18:
├─ Desktop: Mature with revenue
├─ Mobile: iOS & Android LIVE on App Stores
└─ All platforms: Ready for Series A
```

---

## RESOURCE REQUIREMENTS

### Team Needs (By Timeline)
| Role | Month 1 | Month 2-3 | Month 6+ |
|------|---------|-----------|----------|
| Founder/CEO | 100% | 80% (hiring) | 60% (delegation) |
| Web Engineer | — | 100% (FT) | 100% (FT) |
| Mobile Engineer | — | — | 100% (FT) |
| Designer/UX | 50% (contractor) | 50% | 30% |
| DevOps | 20% (contractor) | 20% | 30% (FT) |

### Budget (3 Months for All Platforms)
| Item | Cost |
|------|------|
| Designer (contractor, 30 hrs @ $75/hr) | $2,250 |
| Mobile Developer (contractor, start month 6) | $0 (included in post-seed hire) |
| Desktop packaging tools | $500 |
| App Store fees (iOS, Google Play, Windows) | $150 |
| Hosting & infrastructure | $2,500 |
| Tools (analytics, monitoring, etc.) | $1,000 |
| **TOTAL** | **$6,400** |

---

## SUCCESS METRICS (By Platform)

### Website (Week 4)
- [ ] Live on nexusaigear.com
- [ ] SEO ranking (top 20 for "AI image generator alternatives")
- [ ] 1K organic visitors/month by month 3
- [ ] 5% signup rate (50 free users from 1K visitors)

### Desktop App (Week 12)
- [ ] 50+ downloads by month 3
- [ ] 100+ downloads by month 6
- [ ] 240+ paid users by month 12
- [ ] $7,200+/month revenue

### Mobile Apps (Week 18)
- [ ] 2K+ free users by month 6
- [ ] 300+ paid users by month 12
- [ ] iOS & Android feature parity
- [ ] 4.5+ star rating on app stores
- [ ] $14K+/month revenue

### Web App (Live Now)
- [ ] 99.5% uptime
- [ ] <2s page load time
- [ ] 5K+ free users by month 3
- [ ] 200+ paid users by month 6
- [ ] $7.5K/month revenue by month 6

---

## RISKS & MITIGATION

| Risk | Platform | Mitigation |
|------|----------|-----------|
| App Store rejection | Mobile | Thorough review of guidelines, compliance from day 1 |
| Offline AI too heavy | Desktop | Optimize model, support cloud fallback |
| Marketing website SEO slow | Website | Content strategy, guest posting, partnerships |
| Mobile development delays | Mobile | Start hiring 1-2 months early, MVP-first approach |
| Code signing issues | Desktop | Early certificate setup, test automation |

---

## NEXT STEPS (END OF WEEK 1)

**CRITICAL PATH:**
1. [ ] Server app live by Friday EOD
2. [ ] Website landing page live by end of week 4
3. [ ] Desktop packaged app available for download by week 12
4. [ ] Mobile apps live on stores by week 18

**By Month 18**: All platforms live, $773K ARR, Series A ready.

*Last Updated: July 4, 2026*
