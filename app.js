const { createServer } = require("node:http");

let BOOKS = [
    {
        id: 1,
        title: "Demon Copperhead",
        author: "Kingsolver",
        year: 2022,
    }
];

const PORT = process.env.PORT || 3000;
const HOSTNAME = process.env.HOSTNAME || "localhost";

const server = createServer((req, res) => {
    const method = req.method;
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;


    res.setHeader("Content-Type", "application/json; charset=utf-8");
  
    if (method === "GET" && pathname === "/books") {
    const author = parsedUrl.searchParams.get("author");


    let results = [...BOOKS];
    if (author) {
        results = results.filter(
            (book) => book.author.toLowerCase() === author.toLowerCase(),
        );
    }
    res.statusCode = 200;
    return res.end(
        JSON.stringify({
            count: results.length,
            items: results,
        }),
    );
    }


// --- POST ---
    if (method === "POST" && pathname === "/books") {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk.toString();
        });
        req.on("end", () => {
            try {
                const data = JSON.parse(body);
                        if (!data.title || typeof data.title !== "string") {
                    res.statusCode = 400;
                    return res.end(JSON.stringify({ error: "Valid title is required" }));
                }
        
                if (!data.author || typeof data.author !== "string") {
                    res.statusCode = 400;
                    return res.end(JSON.stringify({ error: "Valid author is required" }));
                }
        
                if (!data.year || typeof data.year !== "number") {
                    res.statusCode = 400;
                    return res.end(JSON.stringify({ error: "Valid year is required" }));
                }
        
                const lastId = BOOKS.length > 0 ? BOOKS[BOOKS.length - 1].id : 0;
                const nextId = lastId + 1;
        
                const newBook = {
                    id: nextId,
                    title: data.title,
                    author: data.author,
                    year: data.year
                };
        
                BOOKS.push(newBook);
        
                res.statusCode = 201;
                res.end(JSON.stringify({ message: "Book created", book: newBook }));
        
            }   catch (err) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: "Invalid JSON" }));
            }
        });
    
        return;
    }
    
// --- PUT ---
if (method === "PUT" && pathname.startsWith("/books/")) {
    const id = parseInt(pathname.split("/")[2]);

    if (isNaN(id)) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "Invalid ID" }));
    }

    let body = "";

    req.on("data", (chunk) => {
        body += chunk.toString();
    });

    req.on("end", () => {
        try {
            const data = JSON.parse(body);

            const index = BOOKS.findIndex((book) => book.id === id);

            if (index === -1) {
                res.statusCode = 404;
                return res.end(JSON.stringify({ error: "Book not found" }));
            }

            // Full validation (all fields required for PUT)
            if (!data.title || typeof data.title !== "string") {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: "Valid title is required" }));
            }

            if (!data.author || typeof data.author !== "string") {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: "Valid author is required" }));
            }

            if (!data.year || typeof data.year !== "number") {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: "Valid year is required" }));
            }

            BOOKS[index] = {
                id: id,
                title: data.title,
                author: data.author,
                year: data.year
            };

            res.statusCode = 200;
            res.end(JSON.stringify({
                message: "Book fully replaced",
                book: BOOKS[index]
            }));

        } catch (err) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: "Invalid JSON" }));
        }
    });

    return;
}

  // --- PATCH ---
    if (method === "PATCH" && pathname.startsWith("/books/")) {
        const id = parseInt(pathname.split("/")[2]);
    
        if (isNaN(id)) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: "Invalid ID" }));
        }
    
        let body = "";
    
        req.on("data", (chunk) => {
            body += chunk.toString();
        });
    
        req.on("end", () => {
            try {
                const updates = JSON.parse(body);
        
                const index = BOOKS.findIndex((book) => book.id === id);
        
                if (index === -1) {
                    res.statusCode = 404;
                    return res.end(JSON.stringify({ error: "Book not found" }));
                }
        
                if (updates.id) {
                    delete updates.id;
                }
        
                if (updates.title && typeof updates.title !== "string") {
                    res.statusCode = 400;
                    return res.end(JSON.stringify({ error: "Invalid title" }));
                }
        
                if (updates.author && typeof updates.author !== "string") {
                    res.statusCode = 400;
                    return res.end(JSON.stringify({ error: "Invalid author" }));
                }
        
                if (updates.year && typeof updates.year !== "number") {
                    res.statusCode = 400;
                    return res.end(JSON.stringify({ error: "Invalid year" }));
                }
        
                BOOKS[index] = { ...BOOKS[index], ...updates };
        
                res.statusCode = 200;
                res.end(JSON.stringify({
                    message: "Book updated",
                    book: BOOKS[index]
                }));
        
            }   catch (err) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: "Invalid JSON" }));
            }
        });
    
        return;
    }

  // --- DELETE ---
    if (method === "DELETE" && pathname.startsWith("/books/")) {
        const id = parseInt(pathname.split("/")[2]);
    
        if (isNaN(id)) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: "Invalid ID" }));
        }
    
        const originalLength = BOOKS.length;
        BOOKS = BOOKS.filter((book) => book.id !== id);
    
        if (BOOKS.length < originalLength) {
            res.statusCode = 200;
            return res.end(JSON.stringify({ message: "Book deleted" }));
        } else {
            res.statusCode = 404;
            return res.end(JSON.stringify({ error: "Book not found" }));
        }
    }

  // 404
    res.statusCode = 404;
    res.end(JSON.stringify({ error: "Route not found" }));
});

server.listen(PORT, HOSTNAME, () => {
    console.log(`Server running at http://${HOSTNAME}:${PORT}/`);
});
