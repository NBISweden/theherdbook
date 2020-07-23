import React from 'react';
import styled from 'styled-components';
import icon from './rabbit-icon.png';

const StyledWrapper = styled.div`
  margin: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
`

const StyledAvatar = styled.div`
  min-width: 20px;
  border: 1px solid;
  border-radius: 50%;
`

const Member = (member) => {

    const { number, avatar } = member;
    return (
        <StyledWrapper>
            <img src={icon} /> 
            <span>{number}</span>
        </StyledWrapper>
    );
}

export default Member;