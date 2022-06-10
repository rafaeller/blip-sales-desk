import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

import Button from '../../components/Button';
import avatar from '../../assets/images/avatar.png';

import '../../assets/styles/styles.css';
import Message from './components/Message';
import SidebarChat from './components/SidebarChat';

const Home = () => {
    const [socket, setSocket] = useState(null);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [ticketId, setTicketId] = useState('');
    const [customerName, setCustomerName] = useState('Customer Name');


    useEffect(() => {
        const newSocket = io.connect(`http://localhost:3000`);
        setSocket(newSocket);
        return () => newSocket.close();
    }, [setSocket]);

    useEffect(() => {
        if (socket) {
            socket.on('recivedMessage', addMessage);
            socket.on('openTickets', (data) => setTickets(data));
            socket.on('lastMessages', (data) => setMessages(data.filter(
                (message) => message.type === "text/plain")
                .map((message) => (
                    {
                        content: message.content,
                        type: message.direction === "received" ? "user" : "agent",
                        time: "19:30"
                    }
                ))));
        }
    }, [socket]);

    const addMessage = (message) => {
        setMessages((prevMessages) => [...prevMessages, message]);
        console.log(messages);
    };

    const handleSend = () => {
        if (socket && input !== '') {
            const message = {
                content: input,
                type: "agent",
                ticketId
            };
            addMessage(message);
            socket.emit('sendMessage', message);
            setInput('');
        }
    };

    return (
        <div className='app-body'>
            <div className="sidebar">
                <div className="header">
                    <div className="avatar">
                        <img src={avatar} alt="" />
                    </div>
                    <div className="chat-header-right flex">
                        <Button 
                            icon='refresh'
                            variant='secondary'
                            onClick={() => 
                                socket.emit('reloadTickets', {})
                            }
                        />
                        <Button icon='message-active' variant='secondary' />
                        <Button icon='more-options-vertical' variant='secondary' />
                    </div>
                </div>
                <div className="sidebar-search">
                    <div className="sidebar-search-container">
                        <Button icon='search' variant='secondary' />
                        <input type="text" placeholder="Search or start new chat" />
                    </div>
                </div>
                <div className="sidebar-chats">
                    {
                        tickets.map((ticket) =>
                            (<SidebarChat
                                ticketId={ticket.id}
                                key={ticket.id}
                                selected={ticketId === ticket.id}
                                contact={{
                                    name: ticket.customerName ? ticket.customerName : ticket.id,
                                    avatar: avatar.toString(),
                                    message: {
                                        content: "oi",
                                        type: "agent",
                                        time: "19:30"
                                    }
                                }}
                                onClick={() => {
                                    console.log(ticket);
                                    setTicketId(ticket.id);
                                    setCustomerName(ticket.customerName ? ticket.customerName : ticket.id);
                                    socket.emit('ticketConnect', {
                                        ticketId: ticket.id,
                                        customerIdentity: ticket.customerIdentity
                                    });
                                    if (ticketId !== ticket.id) {
                                        setMessages([]);
                                    }
                                }}
                            />)
                        )
                    }
                </div>
            </div>
            <div className="message-container">
                <div className="header">
                    <div className="chat-title">
                        <div className="avatar">
                            <img src={avatar} alt="" />
                        </div>
                        <div className="message-header-content">
                            <h4>{customerName}</h4>
                        </div>
                    </div>
                    <div className="chat-header-right flex">
                        <Button icon='search' variant='secondary' />
                        <Button icon='more-options-vertical' variant='secondary' />
                    </div>
                </div>
                <div className="message-content">
                    {
                        messages.map((message) => (<Message message={message} />))
                    }
                </div>
                <div id="chat" className="message-footer">
                    <Button icon='emoji' variant='secondary' />
                    <Button icon='attach' variant='secondary' />
                    <input
                        type="text"
                        value={input}
                        placeholder="Type a message"
                        onChange={(e) => (setInput(e.target.value))}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') { handleSend(); }
                        }}
                    />
                    <Button
                        icon='send'
                        onClick={() => (handleSend())}
                    />
                </div>
            </div>
        </div>
    );
};

Home.propTypes = {};

export default Home;
