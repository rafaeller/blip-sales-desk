import React from 'react';
import PropTypes from 'prop-types';

const Message = ({ message }) => {
    const msgClass = message.type === "agent" ? "chat-message chat-sent" : "chat-message";
    return (
        <p className={msgClass}>{message.content}<span className='chat-timestamp'>11:33 pm</span></p>
    );
};

Message.propTypes = {
    message: PropTypes.object
};

export default Message;
