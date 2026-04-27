import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Shield, Users, Settings, Mail, Phone } from 'lucide-react';
import TeamPermissionsModal from '@/components/team/TeamPermissionsModal';

const ROLE_COLORS = {
  team_admin: 'bg-purple-100 text-purple-700',
  team_member: 'bg-blue-100 text-blue-700',
  team_marketer: 'bg-green-100 text-green-700',
};

export default function ManageTeam() {
  const [user, setUser] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const me = await base44.auth.me();
      setUser(me);
      const operatorId = me.id;
      const allUsers = await base44.entities.User.list('-created_date', 200);
      const members = allUsers.filter(u =>
        ['team_admin', 'team_member', 'team_marketer'].includes(u.primary_account_type) &&
        u.operator_id === operatorId
      );
      setTeamMembers(members);
    } catch (error) {
      console.error('Error loading team:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManagePermissions = (member) => {
    setSelectedMember(member);
    setShowPermissionsModal(true);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-48 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Manage Team</h1>
        <p className="text-slate-600">Control your team members' access and permissions</p>
      </div>

      {teamMembers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg mb-2">No team members yet</p>
            <p className="text-sm text-slate-400">
              Ask your platform admin to create team member accounts linked to your operator ID.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teamMembers.map(member => {
            const initials = member.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'TM';
            const role = member.primary_account_type;
            const permCount = Object.values(member.team_permissions || {}).filter(Boolean).length;

            return (
              <Card key={member.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.profile_image_url} />
                      <AvatarFallback className="bg-orange-600 text-white">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{member.full_name}</p>
                      <Badge className={`text-xs mt-1 ${ROLE_COLORS[role] || 'bg-slate-100 text-slate-700'}`}>
                        {role?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1 text-sm text-slate-600 mb-4">
                    {member.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{member.email}</span>
                      </div>
                    )}
                    {member.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Shield className="w-3.5 h-3.5" />
                      <span>{permCount} permission{permCount !== 1 ? 's' : ''} active</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleManagePermissions(member)}
                      className="border-orange-400 text-orange-700 hover:bg-orange-50"
                    >
                      <Settings className="w-3.5 h-3.5 mr-1" />
                      Permissions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <TeamPermissionsModal
        open={showPermissionsModal}
        onClose={() => {
          setShowPermissionsModal(false);
          setSelectedMember(null);
        }}
        teamMember={selectedMember}
        onSuccess={loadData}
      />
    </div>
  );
}