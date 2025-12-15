# FRP for Busy Nerds

A beautiful, book-like interface for browsing Flashbots Research Proposals (FRPs) from the [Flashbots MEV Research](https://github.com/flashbots/mev-research) repository. This project exists to make FRPs more accessible and readable for busy researchers, builders, and curious readers who want to understand MEV design without digging through every spec and forum thread.

## Features

- **Complete FRP Collection**: Write and organize your own FRPs locally
- **Search Functionality**: Quickly search through FRP titles and content
- **Book-like Interface**: Clean, readable design inspired by the Rust Book
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Fast Loading**: Efficiently loads and renders FRP content
-  **Modern UI**: Beautiful, accessible interface with smooth animations

## Adding FRPs

To add a new FRP:

1. **Create a Markdown file** in the `frps/` directory (e.g., `frp-002.md`)
2. **Write your FRP content** in Markdown format
3. **Add an entry** to `frps/index.json`:

```json
{
  "id": "frp-002",
  "title": "Your FRP Title",
  "filename": "frp-002.md",
  "order": 2
}
```

The `order` field determines the display order in the sidebar. Lower numbers appear first.

### Example FRP Structure

```markdown
# Your FRP Title

## Introduction

Your introduction here...

## Main Content

Your content here...

## Conclusion

Your conclusion here...
```

The first `#` heading in your Markdown file will be used as the title if you don't specify one in `index.json`.

## Deployment to GitHub Pages

### Automatic Deployment (Recommended)

1. **Push to GitHub**: Push this repository to GitHub
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/frp-book.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**:
   - Go to your repository settings on GitHub
   - Navigate to **Pages** in the left sidebar
   - Under **Source**, select **GitHub Actions**
   - The site will automatically deploy on every push to `main` or `master`

3. **Access Your Site**: 
   - Your site will be available at `https://YOUR_USERNAME.github.io/frp-book/`
   - It may take a few minutes for the first deployment to complete

### Manual Deployment

If you prefer to deploy manually:

1. Build or prepare your files (they're already static, so no build needed)
2. Go to repository **Settings** → **Pages**
3. Select **Deploy from a branch**
4. Choose `main` or `master` branch and `/ (root)` folder
5. Click **Save**

## Local Development

To run locally, you can use any static file server:

### Using Python
```bash
python3 -m http.server 8000
```

### Using Node.js
```bash
npx serve
```

### Using PHP
```bash
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## How It Works

The application fetches FRP files directly from the GitHub API:

1. **Fetches FRP List**: Retrieves all markdown files from the `FRPs` directory in the Flashbots repository
2. **Loads Content**: Downloads and parses each FRP file
3. **Renders Content**: Converts Markdown to HTML and displays it in a book-like interface
4. **Enables Search**: Allows users to search through FRP titles and content

## Customization

### Changing the Repository

To use a different repository, edit `app.js`:

```javascript
const REPO_OWNER = 'flashbots';
const REPO_NAME = 'mev-research';
const FRP_PATH = 'FRPs';
```

### Styling

All styles are in `styles.css`. You can customize:
- Colors (CSS variables in `:root`)
- Fonts
- Layout dimensions
- Spacing and sizing

### Adding Features

The codebase is modular and easy to extend. Key files:
- `index.html`: Main HTML structure
- `styles.css`: All styling
- `app.js`: Application logic and GitHub API integration

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

This project is open source and available for use.

## Acknowledgments

- [Flashbots](https://github.com/flashbots) for the MEV research and FRPs
- Inspired by the [Rust Book](https://doc.rust-lang.org/book/) design

