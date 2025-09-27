# PDF Template Builder - Routing Guide

## Complete URL Structure

The application now uses proper routing with dedicated pages for each functionality.

### Main Routes

- **`/`** - Landing page with login/signup links
- **`/login`** - User login page
- **`/signup`** - User registration page
- **`/dashboard`** - Main dashboard with preset list
- **`/dashboard/create-preset?size={sizeId}`** - Create new preset for specific PDF size
- **`/dashboard/create-pdf?presetId={presetId}`** - Create PDF from existing preset
- **`/admin`** - Admin user creation page

### URL Parameters

#### Create Preset
- **size**: PDF size ID (a4, a3, letter, legal, a5)
- Example: `/dashboard/create-preset?size=a4`

#### Create PDF
- **presetId**: UUID of the preset to use
- Example: `/dashboard/create-pdf?presetId=123e4567-e89b-12d3-a456-426614174000`

## Features Added

### 1. **Session Management**
- Sessions now persist for 30 days
- Automatic session refresh
- Better session handling with proper cleanup

### 2. **User Interface Improvements**
- Header with user information and sign-out
- User name/email display
- Better loading states (smaller spinners)
- Improved navigation with back buttons

### 3. **Routing System**
- Proper URL-based navigation
- Browser back/forward button support
- Direct links to specific pages
- URL parameters for state management

### 4. **Performance Optimizations**
- Reduced unnecessary API calls
- Better loading state management
- Improved error handling
- Memory leak prevention

## Navigation Flow

1. **Landing Page** (`/`) → Choose "Sign In" or "Get Started"
2. **Sign Up** (`/signup`) → Create account → Redirects to `/login`
3. **Login** (`/login`) → Sign in → Redirects to `/dashboard`
4. **Dashboard** (`/dashboard`) → Select PDF size → Navigate to `/dashboard/create-preset?size={sizeId}`
5. **Create Preset** → Upload images → Return to `/dashboard`
6. **Create PDF** → Click "Create PDF" → Navigate to `/dashboard/create-pdf?presetId={presetId}`
7. **Generate PDF** → Add content → Download → Return to `/dashboard`

## Technical Improvements

- **Middleware**: Automatic redirects based on authentication state
- **Layout System**: Separate layouts for authenticated and unauthenticated users
- **Component Structure**: Better separation of concerns
- **State Management**: URL-based state instead of component state
- **Error Handling**: Improved error boundaries and user feedback

## Browser Support

- Full browser history support
- Bookmarkable URLs
- Direct link sharing
- Mobile-friendly navigation
