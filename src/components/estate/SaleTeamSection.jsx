import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Mail, MessageSquare, Check, UserPlus, Loader2 } from 'lucide-react';
import InviteTeamMemberModal from '@/components/team/InviteTeamMemberModal';

const TEAM_ROLES = ['team_admin', 'team_member', 'team_marketer'];

const ROLE_COLORS = {
  team_admin: 'bg-purple-100 text-purple-700',
  team_member: 'bg-blue-100 text-blue-700',
  team_marketer: 'bg-green-100 text-green-700',
};

export default function SaleTeamSection({ user, saleTeam = [], onChange }) {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteModalType, setInviteModalType] = useState('email');

  const loadTeam = async () => {
    try {
      const allUsers = await base44.entities.User.list('-created_date', 200);
      const members = allUsers.filter(u =>
        TEAM_ROLES.includes(u.primary_account_type) && u.operator_id === user.id
      );
      setTeamMembers(members);
    } catch (error) {
      console.error('Error loading team members:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) loadTeam();
  }, [user?.id]);

  const toggleMember = (memberId) => {
    onChange(
      saleTeam.includes(memberId)
        ? saleTeam.filter(id => id !== memberId)
        : [...saleTeam, memberId]
    );
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-600" />
              Sale Team
            </h2>
            <p className="text-sm text-slate-600">Team members who help manage this sale</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading team members...
          </div>
        ) : teamMembers.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <UserPlus className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-0.5">No team members in your business profile yet</p>
                <p>Invite a team member and they'll be available to add to this sale once they accept.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => { setInviteModalType('email'); setShowInviteModal(true); }}
                className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email Invite
              </Button>
              <Button
                onClick={() => { setInviteModalType('text'); setShowInviteModal(true); }}
                variant="outline"
                className="border-green-400 text-green-700 hover:bg-green-50 w-full sm:w-auto"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Text Invite
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {teamMembers.map(member => {
              const initials = member.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'TM';
              const assigned = saleTeam.includes(member.id);
              return (
                <div
                  key={member.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    assigned ? 'border-orange-300 bg-orange-50' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarImage src={member.profile_image_url} />
                    <AvatarFallback className="bg-orange-600 text-white text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{member.full_name || member.email}</p>
                    <Badge className={`text-xs mt-0.5 ${ROLE_COLORS[member.primary_account_type] || 'bg-slate-100 text-slate-700'}`}>
                      {member.primary_account_type?.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant={assigned ? 'default' : 'outline'}
                    onClick={() => toggleMember(member.id)}
                    className={assigned
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : 'border-orange-400 text-orange-700 hover:bg-orange-50'}
                  >
                    {assigned ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1" />
                        On Sale
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5 mr-1" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setInviteModalType('email'); setShowInviteModal(true); }}
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite another team member
            </Button>
          </div>
        )}

        <InviteTeamMemberModal
          open={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          operator={user}
          initialInviteType={inviteModalType}
          onSuccess={loadTeam}
        />
      </CardContent>
    </Card>
  );
}