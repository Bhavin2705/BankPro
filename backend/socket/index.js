const socketIo = require('socket.io');
const { authenticateSocket } = require('./middleware/auth.middleware');

const parseOrigins = v => (v || '').split(',').map(i => i.trim()).filter(Boolean);
const allowVercel = String(process.env.ALLOW_VERCEL_PREVIEWS || '').toLowerCase() === 'true';

const getAllowedSocketOrigins = () => new Set([
    process.env.FRONTEND_URL, ...parseOrigins(process.env.FRONTEND_URLS),
    'http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174',
    'http://127.0.0.1:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'
].filter(Boolean));

const isAllowedSocketOrigin = (origin, allowedOrigins) => {
    if (!origin) return true;
    try {
        const host = new URL(origin).hostname;
        if (host === 'localhost' || host === '127.0.0.1' || (allowVercel && host.endsWith('.vercel.app'))) return true;
    } catch (_) { return false; }
    return allowedOrigins.has(origin);
};

const autoResponseRules = [
    { keywords: ['balance', 'check my balance'], text: "I can help you check your account balance. For security reasons, please log into your account dashboard to view your current balance. If you're having trouble accessing your account, I can guide you through the login process." },
    { keywords: ['transfer', 'send money'], text: "To transfer money, you can use our Transfer Money feature in your dashboard. You'll need the recipient's account number or phone number. The transfer limit is $10,000 per day. Would you like me to guide you through the process?" },
    { keywords: ['card', 'pin', 'not working'], text: "I understand you're having card issues. For immediate assistance with lost, stolen, or malfunctioning cards, please call our 24/7 card services at 1-800-BANK-SECURE. I can also help you temporarily freeze your card through your account settings." },
    { keywords: ['loan', 'credit'], text: "I'd be happy to help with loan information. We offer personal loans, auto loans, and home mortgages with competitive rates. You can view current rates and apply online through your dashboard. What type of loan are you interested in?" },
    { keywords: ['security', 'fraud', 'suspicious'], text: "Security is our top priority. If you suspect fraudulent activity, please call our fraud hotline immediately at 1-800-BANK-SECURE. I can also help you review recent transactions and set up account alerts." },
    { keywords: ['branch', 'atm', 'location'], text: "You can find nearby branches and ATMs using our Branch Locator feature in your dashboard. Most branches are open Mon-Fri 9AM-5PM, Saturday 9AM-2PM. ATMs are available 24/7. Would you like me to help you find the nearest location?" },
    { keywords: ['hello', 'hi', 'help'], text: "Hello! I'm here to help you with your banking needs. I can assist with account inquiries, transfers, card issues, loan information, and more. What can I help you with today?" },
    { keywords: ['thank', 'thanks'], text: "You're welcome! I'm glad I could help. If you have any other questions or need further assistance, please don't hesitate to ask. Have a great day!" }
];

const generateAutoResponse = userMessage => {
    const msg = String(userMessage || '').toLowerCase();
    const match = autoResponseRules.find(r => r.keywords.some(k => msg.includes(k)));
    return match ? match.text : "Thank you for contacting BankPro support. I've received your message and will do my best to assist you. For complex issues or immediate assistance, you can also call our 24/7 support line at 1-800-BANK-HELP or visit your nearest branch.";
};

const registerAuthHandlers = (io, socket) => {
    socket.on('join_support', data => {
        socket.join('support');
        if (socket.user?.role === 'admin') socket.join('admin_support');
        socket.to('support').emit('user_joined', { userId: data.userId, name: data.name, timestamp: new Date() });
    });

    socket.on('admin_response', data => {
        if (socket.user?.role === 'admin') {
            io.to(data.userId).emit('support_message', { content: data.content, timestamp: new Date(), agentName: socket.user.name, isAutoResponse: false });
        }
    });
};

const registerNotificationHandlers = socket => {
    socket.on('support_message', data => {
        socket.to(data.userId).emit('support_message', { content: data.content, timestamp: new Date() });
    });

    socket.on('typing', data => {
        socket.to(data.room || 'support').emit('support_typing', { userId: socket.userId, isTyping: data.isTyping });
    });
};

const registerTransactionHandlers = (io, socket) => {
    socket.on('user_message', data => {
        socket.to('admin_support').emit('new_user_message', { userId: socket.userId, name: data.name, content: data.content, timestamp: new Date() });
        const room = io.sockets.adapter.rooms.get('admin_support');
        const hasAdmins = room && room.size > 0;

        setTimeout(() => {
            socket.emit('support_message', {
                content: hasAdmins ? 'Your message has been received by our support team. A live agent will respond to you shortly.' : generateAutoResponse(data.content),
                timestamp: new Date(),
                isAutoResponse: true
            });
        }, hasAdmins ? 500 : 2000);
    });
};

const configureSocket = server => {
    const allowedOrigins = getAllowedSocketOrigins();
    const supportEnabled = String(process.env.SUPPORT_CHAT_ENABLED || '').toLowerCase() === 'true';

    const io = socketIo(server, {
        cors: {
            origin: (origin, cb) => isAllowedSocketOrigin(origin, allowedOrigins) ? cb(null, true) : cb(new Error(`Not allowed by Socket CORS: ${origin}`)),
            methods: ['GET', 'POST'], credentials: true
        }
    });

    io.use(authenticateSocket);
    io.on('connection', socket => {
        if (!supportEnabled) return;
        registerAuthHandlers(io, socket);
        registerNotificationHandlers(socket);
        registerTransactionHandlers(io, socket);
    });

    return io;
};

module.exports = configureSocket;
