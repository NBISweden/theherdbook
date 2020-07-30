import React, { Component } from 'react';
import styled from 'styled-components';
import Member from './member';

const StyledWrapper = styled.div`
    display: flex;
    justify-content: center;
    margin-top: ${props => `${props.level*30}px`};
`

export default class FamilyTree extends Component {

    hasParents(member) {
        return member.parents && member.parents.length;
    }
    render(){
        const level = this.props.level || 0;
        if (this.props.members.length == 0)
            return null;
        return <StyledWrapper level={level}>
            {this.props.members.map((member, i) => {
                return <div key={`level-${level}-${i}`}>
                    <Member {...member} />
                    {<FamilyTree members={member.children} level={level+1} />}
                </div>
            })}
        </StyledWrapper>
    }
}