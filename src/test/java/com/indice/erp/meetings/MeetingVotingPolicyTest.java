package com.indice.erp.meetings;

import static org.assertj.core.api.Assertions.*;
import org.junit.jupiter.api.Test;

class MeetingVotingPolicyTest {
    private final MeetingVotingPolicy policy=new MeetingVotingPolicy();
    @Test void thresholdsUseTheWholeFrozenWeightAndIntegerRounding(){
        assertThat(policy.required("MAJORITY",6)).isEqualTo(4);
        assertThat(policy.required("MAJORITY",7)).isEqualTo(4);
        assertThat(policy.required("TWO_THIRDS",7)).isEqualTo(5);
        assertThat(policy.required("TWO_THIRDS",3)).isEqualTo(2);
        assertThat(policy.required("ALL",7)).isEqualTo(7);
        assertThat(policy.required("MAJORITY",1)).isEqualTo(1);
        assertThatThrownBy(()->policy.required("MAJORITY",0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->policy.required("CUSTOM",10)).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void quorumAbstentionTiesAndAbsentVotesHaveDistinctConsequences(){
        assertThat(policy.outcome(3,0,3,4,4)).isEqualTo("NO_QUORUM");
        assertThat(policy.outcome(3,0,4,4,4)).isEqualTo("NOT_APPROVED");
        assertThat(policy.outcome(4,1,6,4,4)).isEqualTo("APPROVED");
        assertThat(policy.outcome(3,3,6,4,4)).isEqualTo("TIED");
        assertThat(policy.outcome(0,0,6,4,4)).isEqualTo("NOT_APPROVED");
    }
}
