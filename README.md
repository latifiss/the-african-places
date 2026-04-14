---

# 🌍 The African Places API

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-63.6%25-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-green)](https://expressjs.com/)

Welcome to **The African Places API** – your programmatic gateway to discovering locations across Africa. 🚀

This backend service powers the search and geospatial features for [theafricanplaces.com](https://theafricanplaces.com). It's built for performance, allowing you to search, find nearby spots, and import place data efficiently.

## ✨ Key Features

-   **🔍 Intelligent Search**: Full-text and regex-based search to find places by name, road, or city.
-   **📍 Geospatial Queries**: Find places "nearby" using MongoDB's `$near` operator or a bounding box fallback.
-   **⚡ Bulk Import**: Optimized, high-speed insertion of many place records directly via the MongoDB native driver.
-   **🗺️ Autocomplete**: Fast, prefix-based suggestions for a smooth user experience.
-   **🛠️ Built with TypeScript**: Fully typed for better reliability and developer experience.

## 🚀 Live Endpoints

The API is hosted at: **`https://api.theafricanplaces.com`**

For detailed, interactive documentation on all available routes, request/response formats, and examples, please visit our main website:
👉 **[theafricanplaces.com/docs](https://theafricanplaces.com)**

*(A quick example: `GET /api/places/nearby?lat=6.5244&lon=3.3792&radius=5`)*

## 🛠️ Tech Stack

-   **Runtime**: Node.js
-   **Framework**: Express.js
-   **Language**: TypeScript
-   **Database**: MongoDB with Geospatial indexes
-   **ODM**: Mongoose

## 📂 Project Structure

```
.
├── controllers/     # Request handlers (places, search, nearby logic)
├── db/              # Database connection setup
├── middleware/      # Custom Express middleware
├── models/          # Mongoose data models (e.g., Place)
├── routes/          # API route definitions
├── scripts/         # Utility or maintenance scripts
├── index.ts         # Application entry point
└── package.json
```

## 🧪 Local Development

Follow these steps to run the API on your own machine.

1.  **Clone the repository**
    ```bash
    git clone https://github.com/latifiss/the-african-places.git
    cd the-african-places
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Set up environment variables**
    Create a `.env` file in the root directory with the following:
    ```env
    PORT=5000
    MONGODB_URI=your_mongodb_connection_string
    ```

4.  **Run in development mode**
    ```bash
    npm run dev
    ```
    The server will start at `http://localhost:5000`.

5.  **Build for production**
    ```bash
    npm run build
    npm start
    ```

## 🤝 Contributing

Contributions are welcome! If you have suggestions for improvements, new features, or find a bug, please feel free to open an issue or submit a pull request.

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

Distributed under the MIT License. See the `LICENSE` file for more information.

## 📞 Contact & Attribution

-   **Maintainer**: [latifiss](https://github.com/latifiss)
-   **Project Website**: [theafricanplaces.com](https://theafricanplaces.com)

---

**Made with ❤️ for exploring Africa**
