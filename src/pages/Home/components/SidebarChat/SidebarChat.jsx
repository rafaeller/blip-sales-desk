import React from 'react';
import PropTypes from 'prop-types';

const SidebarChat = ({ contact, selected, ticketId, onClick, onKeyDown }) => 
    (
        <div 
            className={selected ? "sidebar-chat sidebar-chat-selected" : "sidebar-chat"}
            onClick={onClick}
            ticketId={ticketId}
            onKeyDown={onKeyDown}
            aria-hidden="true"
        >
            <div className="chat-avatar">
                <img src={contact.avatar} alt=""/>
            </div>
            <div className="chat-info">
                <h4>{contact.name}</h4>
                <p>{contact.message.content}</p>
            </div>
            <div className="time">
                <p>{contact.message.time}</p>
            </div>
        </div>
    );


SidebarChat.propTypes = {
    ticketId: PropTypes.string,
    selected: PropTypes.bool,
    contact: PropTypes.object,
    onClick: PropTypes.func,
    onKeyDown: PropTypes.func
};

export default SidebarChat;
