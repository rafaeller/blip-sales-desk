const express = require('express');
const https = require('https');
const axios = require('axios');
var uuid = require('uuid');

const app = express();
const server = require('http').createServer(app);
const io = require("socket.io")(server, {
    cors: {
        origin: "http://localhost:3001",
        methods: ["GET", "POST"]
    }
});

const instance = axios.create({
    httpsAgent: new https.Agent({  
        rejectUnauthorized: false
    })
});


app.use(express.json())

const TYPE_TICKET = "application/vnd.iris.ticket+json";
const TYPE_TEXT = "text/plain";

const BOT_HEADERS = {
    headers: {
        "Content-Type": "application/json",
        "Authorization": "<BOT_KEY>"
    }
}

const CONTENT_MODERATOR_HEADERS = {
    "Content-Type": "text/plain",
    "Ocp-Apim-Subscription-Key": "<CONTENT_MODERATOR_KEY>",
    "charset": "utf-8"
}

const QNA_HEADERS = {
    "Content-Type": "application/json",
    "Authorization": "<QNA_KEY>"
}

const requestQnaAsync = async(input) => {
    response = await instance.post('https://qna-cda-poc.azurewebsites.net/qnamaker/knowledgebases/8b74e07c-f366-4c3e-8272-e2d328f64003/generateAnswer',
        {"question":input},
        {headers: QNA_HEADERS});
    console.log(response.data);
    return response.data
}


const checkContentModeratorAsync = async(input) => {
    response = await instance.post('https://brazilsouth.api.cognitive.microsoft.com/contentmoderator/moderate/v1.0/ProcessText/Screen?autocorrect=true&classify=True&language=por',
        input,
        {headers: CONTENT_MODERATOR_HEADERS});
    return response.data
}

const copilotUserInputAsync = async(input, ticket) => {
    if ( ["copilot", "autopilot"].includes(ticket.copilotStatus) ) {
        qna = await requestQnaAsync(input)
        console.log(qna);
        if(qna['answers'][0]['score'] > 60){
            await new Promise(r => setTimeout(r, 3000));
            answer = qna['answers'][0]['answer']
            await sendCopilotContent(answer, ticket, ticket.copilotStatus === "autopilot" ? 3000 : 1, "copilot/response")
            if(ticket.copilotStatus === "copilot") {
                io.to(ticket.socketId).emit("recivedMessage", {
                    from: ticket.copilotStatus,
                    ticketId: ticket.ticketId,
                    content: answer,
                    type: 'copilot/options'
                });
            }
        }
    }
}

const sendCopilotContent = async(input, ticket, time, type) => {
    messages = input.split('~~');
    for (let msg of messages){
        await new Promise(r => setTimeout(r, time));
        if(msg.includes('|')){
            splitedMsg = msg.split('|')
            content = {
                "type": splitedMsg[0],
                "uri": splitedMsg[1],
            };
            if(ticket.copilotStatus === "autopilot" || type === "copilot/message") {
                sendMessage(ticketId, content, "application/vnd.lime.media-link+json");
            }
            if(type === "copilot/response") { 
                io.to(ticket.socketId).emit("recivedMessage", {
                    from: ticket.copilotStatus,
                    ticketId: ticket.ticketId,
                    content: splitedMsg[1],
                    type: splitedMsg[0]
                }); 
            }
        }
        else{
            if(ticket.copilotStatus === "autopilot" || type === "copilot/message") {
                sendMessage(ticketId, msg);
            }
            if(type === "copilot/response") { 
                io.to(ticket.socketId).emit("recivedMessage", {
                    from: ticket.copilotStatus,
                    ticketId: ticket.ticketId,
                    content: msg,
                    type: 'text/plain'
                });
            }
        }
    }
}

function openTicket(ticketId) {
    axios.post('https://http.msging.net/commands', {
        id: uuid.v4(),
        to: "postmaster@desk.msging.net",
        method: "set",
        uri: "/tickets/change-status",
        type: "application/vnd.iris.ticket+json",
        resource: {
            id: ticketId,
            status: "Open",
            agentIdentity: "superAgent"
        }
    }, BOT_HEADERS)
        .then(function (response) {
            console.log(response.data);
        })
        .catch(function (error) {
            console.log(error);
        });
}

function sendMessage(ticketId, content, contentType = "text/plain") {
    axios.post('https://http.msging.net/messages', {
        "type": contentType,
        "content": content,
        "id": uuid.v4(),
        "to": `${ticketId}@desk.msging.net/Webhook`
    }, BOT_HEADERS)
        .catch(function (error) {
            console.log(error);
        });
}

function getAllTickets(socketId) {
    axios.post('https://http.msging.net/commands', {
        "id": uuid.v4(),
        "method": "get",
        "uri": "/monitoring/open-tickets?version=2",
        "to": `postmaster@desk.msging.net`
    }, BOT_HEADERS)
        .then(function (response) {
            io.to(socketId).emit('openTickets', response.data.resource.items.sort((a, b) => b.sequentialId - a.sequentialId));
        })
        .catch(function (error) {
            console.log(error);
        });
}

function getLastMessages(customerIdentity, socketId) {
    if (customerIdentity.includes('@tunnel.msging.net')) {
        axios.post('https://http.msging.net/commands', {
            "id": uuid.v4(),
            "method": "get",
            "uri": `/contacts/${customerIdentity}`,
        }, BOT_HEADERS)
            .then(function (response) {
                axios.post('https://http.msging.net/commands', {
                    "id": uuid.v4(),
                    "method": "get",
                    "uri": `lime://${response.data.resource.extras['tunnel.owner']}/threads/${response.data.resource.extras['tunnel.originator']}?$take=20&refreshExpiredMedia=true`,
                }, BOT_HEADERS)
                    .then(function (response) {
                        io.to(socketId).emit('lastMessages', response.data.resource.items.sort((a, b) => new Date(a.date) - new Date(b.date)));
                    })
                    .catch(function (error) {
                        console.log(error);
                    });
            })
            .catch(function (error) {
                console.log(error);
            });
    } else {
        axios.post('https://http.msging.net/commands', {
            "id": uuid.v4(),
            "method": "get",
            "uri": `/threads/${customerIdentity}?$take=20&refreshExpiredMedia=true`,
        }, BOT_HEADERS)
            .then(function (response) {
                io.to(socketId).emit('lastMessages', response.data.resource.items.sort((a, b) => new Date(a.date) - new Date(b.date)));
            })
            .catch(function (error) {
                console.log(error);
            });
    }
}

app.use('/webhook', (req, res) => {
    if (req.body.type === TYPE_TICKET) {
        console.log(req.body);
        ticketId = req.body.content.id;
        openTicket(ticketId);
        res.sendStatus(200);
    }
    ticketId = req.body.from.split("@")[0];
    ticket = getTicket(ticketId);
    if (req.body.type === TYPE_TEXT && ticket) {
        io.to(ticket.socketId).emit("recivedMessage", { from: 'user', ticketId: ticket.ticketId, content: req.body.content });
        copilotUserInputAsync(req.body.content, ticket);
        res.sendStatus(200);
    }
})

let tickets = [];

const getTicket = (ticketId) => {
    return tickets.find((ticket) => ticket.ticketId === ticketId);
};

const addTicket = (ticketId, socketId) => {
    !tickets.some((ticket) => ticket.ticketId === ticketId) &&
        tickets.push({ ticketId, socketId, copilotStatus: "copilot" });
};

const removeTicket = (socketId) => {
    tickets = tickets.filter((ticket) => ticket.socketId !== socketId);
};

io.on('connection', socket => {
    console.log(`Connected ${socket.id}`);
    getAllTickets(socket.id);

    socket.on('disconnect', data => {
        console.log(`Desonnected ${socket.id}`);
        removeTicket(socket.id);
    });

    socket.on('reloadTickets', () => {
        getAllTickets(socket.id);
    });

    socket.on('ticketConnect', data => {
        addTicket(data.ticketId, socket.id);
        getLastMessages(data.customerIdentity, socket.id);
    });

    socket.on('sendMessage', async (data) => {
        contentModerator = await checkContentModeratorAsync(data.content);
        console.log(contentModerator);
        if (contentModerator.Terms === null) {
            data.content = contentModerator.AutoCorrectedText;
            sendMessage(data.ticketId, data.content);
            io.to(socket.id).emit("recivedMessage", data);
            console.log(data);
        }else{
            console.log('mensagem ofensiva');
            io.to(socket.id).emit("recivedMessage", { from: 'forbiden', ticketId: data.ticketId, content: data.content, type: "text/plain" });
        }
    });

    socket.on('sendCopilotMessage', async (data) => {
        console.log(data);
        ticket = getTicket(data.ticketId);
        await sendCopilotContent(data.content, ticket, 3000, "copilot/message");
        await new Promise(r => setTimeout(r, 1000));
        getLastMessages(data.customerIdentity, socket.id);
    });
})

server.listen(3000)
