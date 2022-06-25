import React from 'react';
import PropTypes from 'prop-types';
import Button from '../../../../components/Button';

const Message = ({ message, socket, ticketId, customerIdentity }) => {
    const msgTypes = {
        "agent" : "chat-message chat-sent",
        "copilot" : "chat-message chat-sent-copilot",
        "autoilot" : "chat-message chat-sent-autoilot",
        "forbiden" : "chat-message chat-sent-forbiden",
        "user" : "chat-message"
    }

    const msgClass = msgTypes[message.from] || "chat-message";
    if(message.type === "video/mp4"){
        return (
            <div className={msgClass}>
                <video className='message-image' controls>
                    <source src={message.content} type="video/mp4"></source>
                </video>
                <span className='chat-timestamp tr'>11:33 pm</span>
            </div>
        )
    }
    else if(message.type === "image/png"){
        return (
            <div className={msgClass}><img className='message-image' src={message.content}></img><span className='chat-timestamp tr'>11:33 pm</span></div>
        )
    }
    else if(message.type === "copilot/options"){
        return (
            <div className={msgClass}>
                <p>Gostaria de enviar as sugestoes do copilot?</p>
                <div className="flex justify-around ">
                    <Button
                        variant='primary'
                        onClick={(event) => {
                            event.currentTarget.disabled = true;
                            socket.emit("sendCopilotMessage", {
                                from: "agent",
                                ticketId: ticketId,
                                content: message.content,
                                customerIdentity: customerIdentity,
                                type: 'copilot/message'
                            })
                        }
                    }
                    >
                    Enviar    
                    </Button>
                    <Button
                        variant='delete'
                        onClick={() => (socket.emit('ticketConnect', {
                            ticketId: ticketId,
                            customerIdentity: customerIdentity
                        }))}
                    >
                    Cancelar    
                    </Button> 
                </div>
                
            </div>
            
        )
    }
    return (
        <p className={msgClass}>{message.content}<span className='chat-timestamp'>11:33 pm</span></p>
    );
};

Message.propTypes = {
    message: PropTypes.object
};

export default Message;
