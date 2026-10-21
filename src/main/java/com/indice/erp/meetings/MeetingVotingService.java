package com.indice.erp.meetings;

import static com.indice.erp.meetings.MeetingVotingDtos.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MeetingVotingService {
    private final MeetingVotingRepository votes;
    private final MeetingRepository repository;
    private final MeetingService meetings;
    private final MeetingVotingPolicy policy;
    private final ModuleAccessService modules;
    private final TabPermissionAccessService tabs;
    public MeetingVotingService(MeetingVotingRepository votes,MeetingRepository repository,MeetingService meetings,
        MeetingVotingPolicy policy,ModuleAccessService modules,TabPermissionAccessService tabs) {
        this.votes=votes;this.repository=repository;this.meetings=meetings;this.policy=policy;this.modules=modules;this.tabs=tabs;
    }
    private boolean eligible(long company,long user) {
        if(!repository.employmentEligible(company,user))return false;
        var actors=votes.jdbc().query("SELECT id,role FROM user_companies WHERE company_id=? AND user_id=? AND status='active' ORDER BY id DESC LIMIT 1",
            (r,n)->new AuthSessionUser(user,company,r.getLong(1),"Voting participant",r.getString(2)),company,user);
        return !actors.isEmpty()&&modules.canAccess(actors.getFirst(),"control_minutas")
            &&tabs.canAccess(actors.getFirst(),new TabPermissionRequirement(List.of("control_minutas.meetings")));
    }
    private List<MeetingDtos.Member> people(AuthSessionUser actor,long id) {
        var row=repository.meeting(actor,id,false);
        var people=new ArrayList<>(repository.participants(actor.companyId(),id));
        if(people.stream().noneMatch(p->p.id()==row.ownerId()))people.add(new MeetingDtos.Member(row.ownerId(),row.ownerName()));
        return people;
    }
    @Transactional(readOnly=true)
    public Team team(AuthSessionUser actor,long meeting) {
        MeetingService.owner(actor,repository.meeting(actor,meeting,false).ownerId());
        var team=people(actor,meeting).stream().map(p->new TeamPerson(p.id(),p.name(),eligible(actor.companyId(),p.id()))).toList();
        var ids=votes.jdbc().queryForList("SELECT id FROM meeting_ballots WHERE company_id=? AND meeting_id=? ORDER BY id DESC LIMIT 1",Long.class,actor.companyId(),meeting);
        ReusableSetup previous=null;
        if(!ids.isEmpty()) {
            long id=ids.getFirst();var prior=votes.row(actor.companyId(),meeting,id,false);
            previous=new ReusableSetup(votes.roles(actor.companyId(),id),votes.voters(actor.companyId(),id).stream().map(p->new Assignment(p.userId(),p.roleKey())).toList(),prior.approvalRule(),prior.quorumRule());
        }
        return new Team(team,previous);
    }
    @Transactional(readOnly=true)
    public MeetingDtos.Page<Ballot> list(AuthSessionUser actor,long meeting,int page) {
        repository.meeting(actor,meeting,false);
        if(page<1||page>10)throw new IllegalArgumentException();
        long total=votes.jdbc().queryForObject("SELECT COUNT(*) FROM meeting_ballots WHERE company_id=? AND meeting_id=?",Long.class,actor.companyId(),meeting);
        var ids=votes.jdbc().queryForList("SELECT id FROM meeting_ballots WHERE company_id=? AND meeting_id=? ORDER BY id DESC LIMIT 10 OFFSET ?",Long.class,actor.companyId(),meeting,(page-1)*10);
        boolean canVote=eligible(actor.companyId(),actor.userId());
        return new MeetingDtos.Page<>(ids.stream().map(id->ballot(actor,meeting,id,canVote)).toList(),total,page,10);
    }
    private Ballot ballot(AuthSessionUser actor,long meeting,long id,boolean eligible) {
        var row=votes.row(actor.companyId(),meeting,id,false);
        var own=votes.voters(actor.companyId(),id).stream().filter(p->p.userId()==actor.userId()).findFirst().orElse(null);
        return new Ballot(id,meeting,row.subject(),row.description(),row.status(),row.outcome(),row.approvalRule(),row.quorumRule(),
            row.total(),row.approval(),row.quorum(),votes.tally(actor.companyId(),id),row.version(),row.createdAt(),row.closedAt(),row.reason(),
            own==null?null:own.choice(),own==null?0:own.voteVersion(),own==null?0:own.weight(),own==null?"":own.roleName(),
            eligible&&own!=null&&own.weight()>0&&row.status().equals("OPEN")
                &&repository.meeting(actor,meeting,false).status().equals("IN_PROGRESS"));
    }
    @Transactional(readOnly=true)
    public Detail detail(AuthSessionUser actor,long meeting,long id) {
        repository.meeting(actor,meeting,false);
        var ballot=ballot(actor,meeting,id,eligible(actor.companyId(),actor.userId()));
        var people=votes.voters(actor.companyId(),id).stream().map(p->new Voter(p.userId(),p.name(),p.roleKey(),p.roleName(),p.weight(),
            p.choice(),p.voteVersion(),p.votedAt(),eligible(actor.companyId(),p.userId()))).toList();
        return new Detail(ballot,votes.roles(actor.companyId(),id),people,votes.history(actor.companyId(),id));
    }
    @Transactional
    public Detail open(AuthSessionUser actor,long meeting,OpenRequest body,String key) {
        meetings.lock(actor);if(!eligible(actor.companyId(),actor.userId()))throw new SecurityException();
        var row=repository.meeting(actor,meeting,true);MeetingService.owner(actor,row.ownerId());
        String hash=meetings.fingerprint(List.of(meeting,body));Long replay=meetings.replay(actor,"BALLOT",key,hash);
        if(replay!=null)return detail(actor,meeting,replay);
        if(!row.status().equals("IN_PROGRESS"))throw new MeetingPlanningException("meeting_voting_not_running");
        if(body.subject()==null||body.subject().isBlank()||body.subject().length()>240||body.description()==null||body.description().length()>3000
            ||body.roles()==null||body.roles().isEmpty()||body.roles().size()>12||body.voters()==null||body.voters().isEmpty()||body.voters().size()>101)throw new IllegalArgumentException();
        if(votes.jdbc().queryForObject("SELECT COUNT(*) FROM meeting_ballots WHERE company_id=? AND meeting_id=?",Integer.class,actor.companyId(),meeting)>=100)
            throw new MeetingPlanningException("meeting_voting_limit");
        var roles=new LinkedHashMap<String,Role>();var names=new HashSet<String>();var keys=new HashSet<String>();
        for(var role:body.roles()) {
            if(role==null||role.key()==null||!role.key().matches("[A-Za-z0-9_-]{1,24}")||role.name()==null||role.name().isBlank()||role.name().length()>60
                ||role.weight()<0||role.weight()>1000||!keys.add(role.key().toLowerCase(Locale.ROOT))||roles.putIfAbsent(role.key(),role)!=null||!names.add(role.name().trim().toLowerCase(Locale.ROOT)))
                throw new MeetingPlanningException("meeting_voting_roles_invalid");
        }
        var team=new HashMap<Long,MeetingDtos.Member>();people(actor,meeting).forEach(p->team.put(p.id(),p));
        var selected=new HashSet<Long>();int total=0;
        for(var assignment:body.voters()) {
            if(assignment==null||!team.containsKey(assignment.userId())||!selected.add(assignment.userId())||!roles.containsKey(assignment.roleKey()))
                throw new MeetingPlanningException("meeting_voting_team_changed");
            int weight=roles.get(assignment.roleKey()).weight();
            if(weight>0&&!eligible(actor.companyId(),assignment.userId()))throw new MeetingPlanningException("meeting_voting_member_unavailable");
            total+=weight;
        }
        if(!selected.equals(team.keySet()))throw new MeetingPlanningException("meeting_voting_team_changed");
        if(total<1)throw new MeetingPlanningException("meeting_voting_no_weight");
        int approval=policy.required(body.approvalRule(),total),quorum=policy.required(body.quorumRule(),total);
        long id=votes.insert("INSERT INTO meeting_ballots(company_id,meeting_id,subject,description,approval_rule,quorum_rule,total_weight,approval_weight,quorum_weight,created_by) VALUES(?,?,?,?,?,?,?,?,?,?)",
            actor.companyId(),meeting,body.subject().trim(),body.description().trim(),body.approvalRule(),body.quorumRule(),total,approval,quorum,actor.userId());
        for(var role:roles.values())votes.jdbc().update("INSERT INTO meeting_ballot_roles(company_id,ballot_id,role_key,name,weight) VALUES(?,?,?,?,?)",actor.companyId(),id,role.key(),role.name().trim(),role.weight());
        for(var assignment:body.voters())votes.jdbc().update("INSERT INTO meeting_ballot_voters(company_id,ballot_id,user_id,name_snapshot,role_key) VALUES(?,?,?,?,?)",
            actor.companyId(),id,assignment.userId(),team.get(assignment.userId()).name(),assignment.roleKey());
        meetings.remember(actor,"BALLOT",key,hash,id);votes.audit(actor.companyId(),id,actor.userId(),"OPENED",null,"");
        meetings.audit(actor,meeting,null,"VOTING_OPENED","");
        return detail(actor,meeting,id);
    }
    @Transactional
    public Detail cast(AuthSessionUser actor,long meeting,long id,VoteRequest body) {
        meetings.lock(actor);var row=repository.meeting(actor,meeting,true);var ballot=votes.row(actor.companyId(),meeting,id,true);
        if(body.choice()==null||!Set.of("YES","NO","ABSTAIN").contains(body.choice())||body.expectedVoteVersion()<0)throw new IllegalArgumentException();
        var own=votes.voters(actor.companyId(),id).stream().filter(p->p.userId()==actor.userId()).findFirst().orElseThrow(SecurityException::new);
        if(own.weight()<1||!eligible(actor.companyId(),actor.userId()))throw new SecurityException();
        // A retry acknowledges the exact last vote, including if the ballot closed after that vote.
        if(body.choice().equals(own.choice())&&(own.voteVersion()==body.expectedVoteVersion()||own.voteVersion()==body.expectedVoteVersion()+1))return detail(actor,meeting,id);
        if(!row.status().equals("IN_PROGRESS")||!ballot.status().equals("OPEN"))throw new IllegalStateException();
        if(own.voteVersion()!=body.expectedVoteVersion())throw new IllegalStateException();
        votes.jdbc().update("UPDATE meeting_ballot_voters SET choice=?,vote_version=vote_version+1,voted_at=UTC_TIMESTAMP(6) WHERE company_id=? AND ballot_id=? AND user_id=?",body.choice(),actor.companyId(),id,actor.userId());
        votes.jdbc().update("UPDATE meeting_ballots SET version=version+1 WHERE company_id=? AND id=?",actor.companyId(),id);
        votes.audit(actor.companyId(),id,actor.userId(),own.choice()==null?"VOTED":"VOTE_CHANGED",body.choice(),"");
        return detail(actor,meeting,id);
    }
    @Transactional
    public Detail close(AuthSessionUser actor,long meeting,long id,CloseRequest body) {
        meetings.lock(actor);if(!eligible(actor.companyId(),actor.userId()))throw new SecurityException();
        var row=repository.meeting(actor,meeting,true);MeetingService.owner(actor,row.ownerId());
        var ballot=votes.row(actor.companyId(),meeting,id,true);
        if(!Set.of("CLOSE","CANCEL").contains(body.action())||body.reason()==null||body.reason().length()>2000)throw new IllegalArgumentException();
        String status=body.action().equals("CLOSE")?"CLOSED":"CANCELLED";
        if(ballot.status().equals(status)&&ballot.version()==body.expectedVersion()+1&&ballot.reason().equals(body.reason().trim()))return detail(actor,meeting,id);
        MeetingService.version(ballot.version(),body.expectedVersion());
        if(!row.status().equals("IN_PROGRESS")||!ballot.status().equals("OPEN"))throw new IllegalStateException();
        if(status.equals("CANCELLED")&&body.reason().trim().length()<3)throw new IllegalArgumentException();
        var tally=votes.tally(actor.companyId(),id);
        String result=status.equals("CANCELLED")?"CANCELLED":policy.outcome(tally.yes(),tally.no(),tally.cast(),ballot.approval(),ballot.quorum());
        votes.jdbc().update("UPDATE meeting_ballots SET status=?,outcome=?,closed_by=?,closed_at=UTC_TIMESTAMP(6),close_reason=?,version=version+1 WHERE company_id=? AND id=?",
            status,result,actor.userId(),body.reason().trim(),actor.companyId(),id);
        votes.audit(actor.companyId(),id,actor.userId(),status,null,body.reason().trim());
        meetings.audit(actor,meeting,null,status.equals("CLOSED")?"VOTING_CLOSED":"VOTING_CANCELLED","");
        return detail(actor,meeting,id);
    }
}
