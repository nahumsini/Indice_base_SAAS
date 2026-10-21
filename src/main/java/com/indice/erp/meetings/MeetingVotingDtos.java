package com.indice.erp.meetings;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

public final class MeetingVotingDtos {
    private MeetingVotingDtos() { }
    public record Role(@NotBlank @Pattern(regexp="[A-Za-z0-9_-]{1,24}") String key,
        @NotBlank @Size(max=60) String name,@Min(0) @Max(1000) int weight) {
        @Override public String toString(){return "VotingRole[protected]";}
    }
    public record Assignment(@Positive long userId,@NotBlank String roleKey) { }
    public record OpenRequest(@NotBlank @Size(max=240) String subject,@NotNull @Size(max=3000) String description,
        @NotBlank String approvalRule,@NotBlank String quorumRule,
        @NotNull @Size(min=1,max=12) List<@Valid Role> roles,
        @NotNull @Size(min=1,max=101) List<@Valid Assignment> voters) {
        @Override public String toString(){return "OpenBallotRequest[protected]";}
    }
    public record VoteRequest(@NotBlank String choice,@Min(0) long expectedVoteVersion) { }
    public record CloseRequest(@NotBlank String action,@NotNull @Size(max=2000) String reason,
        @Positive long expectedVersion) { @Override public String toString(){return "CloseBallotRequest[protected]";} }
    public record TeamPerson(long userId,String name,boolean eligible) {
        @Override public String toString(){return "VotingTeamPerson[protected]";}
    }
    public record ReusableSetup(List<Role> roles,List<Assignment> assignments,String approvalRule,String quorumRule) { }
    public record Team(List<TeamPerson> people,ReusableSetup previous) { }
    public record Tally(int yes,int no,int abstain,int cast,int castCount,int voterCount) { }
    public record Ballot(long id,long meetingId,String subject,String description,String status,String outcome,
        String approvalRule,String quorumRule,int totalWeight,int approvalWeight,int quorumWeight,Tally tally,
        long version,Instant createdAt,Instant closedAt,String closeReason,String myChoice,long myVoteVersion,
        int myWeight,String myRole,boolean canVote) {
        @Override public String toString(){return "MeetingBallot[protected]";}
    }
    public record Voter(long userId,String name,String roleKey,String roleName,int weight,String choice,
        long voteVersion,Instant votedAt,boolean eligible) {
        @Override public String toString(){return "BallotVoter[protected]";}
    }
    public record Audit(String actorName,String action,String choice,String reason,Instant occurredAt) {
        @Override public String toString(){return "BallotAudit[protected]";}
    }
    public record Detail(Ballot ballot,List<Role> roles,List<Voter> voters,List<Audit> history) { }
    public record Result(long id,String subject,String outcome,String approvalRule,int totalWeight,
        int approvalWeight,int quorumWeight,Tally tally,Instant closedAt,String closeReason) {
        @Override public String toString(){return "BallotResult[protected]";}
    }
}
