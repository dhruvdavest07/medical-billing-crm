# Medical Billing CRM

A medical billing CRM built on top of [OpenHealthCRM](https://github.com/pras75299/OpenHealthCRM). It manages billing orders (claims), patients, medical facilities/providers, document uploads, comment timelines, employee work tracking, and target monitoring.

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS, Radix UI, Framer Motion
- **Backend**: Next.js API routes (App Router)
- **Database**: PostgreSQL with Prisma 7 ORM
- **Auth**: Auth.js (NextAuth) with role-based access control
- **Multi-tenant**: Organization-scoped data throughout
- **Storage**: S3-compatible (AWS S3, Cloudflare R2, MinIO) with local fallback
- **Clearinghouse**: Availity integration with mock provider for development

## Prerequisites

- Node.js 18 +(Node 20 recommended)
- PostgreSQL 14+ (or Neon/Supabase cloud Postgres)
- npm or yarn
- Optional: S3-compatible bucket for document storage
- Optional: Availity API credentials for claim submission

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/dhruvdavest07/medical-billing-crm.git
cd medical-billing-crm
npm install

# Install factory-added dependencies
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/modifiers @dnd-kit/utilities @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# 2. Set up environment variables
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/medical_billing_crm?schema=public"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
SKIP_DB_INIT=""

# Optional: S3 storage
S3_BUCKET=""
S3_REGION=""
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
S3_ENDPOINT="‚‚ˆÈÜ[Û˜[ˆÛX\š[™Úİ\ÙH›İšY\‚ÓPT’S‘ÒÕTÑWÔ“Õ’QTH›[ØÚÈ‚URSUWĞÓQS•ÒQHˆ‚URSUWĞÓQS•ÔÑPÔ‘UHˆ‚URSUWĞTÑWÕT“Hˆ˜‚˜˜\ÚˆÈËˆ[ˆ]X˜\ÙHZYÜ˜][ÛœÂ›œš\ÛXHZYÜ˜]H\ŞB‚ˆÈˆÙYYH]X˜\ÙB›œH[ˆœÙYY‚ˆÈKˆİ\H]ˆÙ\™\‚›œH[ˆ]‚˜‚“Ü[ˆ‹ËÛØØ[ÜİŒÌ‚ˆÈÈ[[ÈÜ™Y[X[Â‚Y\ˆÙYY[™ËÙÈ[ˆÚ]‚‚Ÿ[XZ[\ÜİÛÜ™›ÛHŸKKKKKK_KKKKKKKKK_KKKKK_ŸYZ[XÛYXÛ[šXË˜ÛÛHYZ[ŒLŒÈİ\\ˆYZ[ˆŸÜĞXÛYXÛ[šXË˜ÛÛHYZ[ŒLŒÈÜ\˜][ÛœÈŸš[[™ĞXÛYXÛ[šXË˜ÛÛHYZ[ŒLŒÈš[\ˆ‚ˆÈÈ™X]\™\Â‚ˆÈÈÈš[[™ÈÜ™\œÈ
ÛÜ™\œØ
B‹HÜ™X]KÙX\˜Ú[™š[\ˆš[[™ÈÜ™\œÂ‹HÙX\˜ÚHÜ™\ˆ[X™\‹]Y[˜[YKT“‹ÜˆÛZ[H[X™\‚‹Hš[\ˆHİ]\È
™]Ë[—Ü›ÙÜ™\ÜËİX›Z]Y[™[™ËZY[šYYÛÛ\]Y
B‹H\‹Y^HYÙH[™XØ]Ü‚‹Hš[Üš]HšY[‹H
Š‘˜YËX[™Y›Üš[Üš]H™[Ü™\š[™ÊŠˆšXH™ZÚ]‚ˆÈÈÈÜ™\ˆ]Z[
ÛÜ™\œËÎšY
B‚ˆÈÈÈ˜XÚ[]Y\È
Ù˜XÚ[]Y\Ø
B‹H[Ô•QYÙH›ÜˆYYXØ[˜XÚ[]Y\ËÜ›İšY\œÂ‹HÙX\˜ÚH˜[YB‹HÜ™X]H˜XÚ[]H[›[™B‹H˜XÚ[]H]Z[YÙHÚ]Y]X›H›Ü›K[šÙYš[[™ÈÜ™\œË[™˜XÚ[]H›İ\Â‹H[]H›İXİ[Ûˆ
›ØÚÜÈYˆ[šÙYš[[™ÈÜ™\œÈ^\İ™]\›œÈJB‚ˆÈÈÈYZ[ˆ\Ú›Ø\™
ØYZ[˜
B‹Hİ[[X\HØ\™ËÜ™\ˆİ]\È\İšX][Û‹š[Üš]H]Y]YB‹H[\ŞYYHÛÜšÈ˜XÚÚ[™Ë\™Ù]˜XÚÚ[™Â‚ˆÈÈÈ™X[U[YH\]\È
ÔÑJB‹HÜ™\ˆÛÛ[Y[Èİ™X[H]™HšXHÙ\™\‹TÙ[]™[Â‹H˜XÚ[]HÛÛ[Y[Èİ™X[H]™HšXHÔÑB‹H\ÙTÔÑPÛÛ[Y[Ø™XXİÛÚÈÚ]^Û™[X[˜XÚÛÙ™‚‚ˆÈÈÈØİ[Y[İÜ˜YÙB‹HÌËXÛÛ\]X›HXœİ˜Xİ[Û‹ØØ[˜[˜XÚÂ‹H][K][˜[Ù^H\ÛÛ][Û‚‹HİšXİš[H\H˜[Y][Û‹LPˆØ\‹HÚYÛ™YT“È›ÜˆÙXİ\™HİÛ›ØY‚‹KKB‚”ÙYH
Š˜RWÒS‘Ñ‘‹›Y
Šˆ›ÜˆRHÛÙ[™È\ÜÚ\İ[È[™
Š˜ÑPÕT’UWĞUQUÔ‘TÔ•›Y
Šˆ›ÜˆHÙXİ\š]H]Y]‚‚“RUXÙ[œÙH
[š\š]Yœ›ÛHÜ[’X[Ô“H\İ™X[JB