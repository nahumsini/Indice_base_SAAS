package com.indice.erp.meetings;

import org.springframework.stereotype.Component;

/** Operational rules use integer points over the frozen electorate, never account/HR authority. */
@Component
public class MeetingVotingPolicy {
    public int required(String rule,int total) {
        if(total<1||total>101000)throw new IllegalArgumentException();
        return switch(rule) {
            case "MAJORITY" -> total/2+1;
            case "TWO_THIRDS" -> (total*2+2)/3;
            case "ALL" -> total;
            default -> throw new IllegalArgumentException();
        };
    }
    public String outcome(int yes,int no,int cast,int approval,int quorum) {
        if(cast<quorum)return "NO_QUORUM";
        if(yes>=approval)return "APPROVED";
        if(yes==no&&yes>0)return "TIED";
        return "NOT_APPROVED";
    }
}
