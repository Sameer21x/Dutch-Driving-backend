const http = require('http');
const app = require('./App'); 
const dotenv = require('dotenv');

dotenv.config();

const port = process.env.PORT || 3000;

const server = http.createServer(app);

server.listen(port, () => {
    console.log(`Server listening on port \x1b[36mhttp://localhost:${port}\x1b[0m`);
});
