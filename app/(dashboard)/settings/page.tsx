'use client';

import { useState, useActionState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Lock, Trash2, PlusCircle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  updateAccount,
  updatePassword,
  deleteAccount,
  removeTeamMember,
  inviteTeamMember,
} from '@/app/(login)/actions';
import { customerPortalAction } from '@/lib/payments/actions';
import { User, TeamDataWithMembers } from '@/lib/db/schema';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type ActionState = {
  error?: string;
  success?: string;
  [key: string]: any;
};

// General Settings Tab
function GeneralTab() {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateAccount,
    {}
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thông tin tài khoản</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" action={formAction}>
          <div>
            <Label htmlFor="name" className="mb-2">
              Tên
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="Nhập tên của bạn"
              defaultValue={state.name || user?.name || ''}
              required
            />
          </div>
          <div>
            <Label htmlFor="email" className="mb-2">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Nhập email của bạn"
              defaultValue={user?.email || ''}
              required
            />
          </div>
          {state.error && (
            <p className="text-red-500 text-sm">{state.error}</p>
          )}
          {state.success && (
            <p className="text-green-500 text-sm">{state.success}</p>
          )}
          <Button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-white"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              'Lưu thay đổi'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Security Tab
function SecurityTab() {
  const [passwordState, passwordAction, isPasswordPending] = useActionState<
    ActionState,
    FormData
  >(updatePassword, {});

  const [deleteState, deleteAction, isDeletePending] = useActionState<
    ActionState,
    FormData
  >(deleteAccount, {});

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mật khẩu</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" action={passwordAction}>
            <div>
              <Label htmlFor="current-password" className="mb-2">
                Mật khẩu hiện tại
              </Label>
              <Input
                id="current-password"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="new-password" className="mb-2">
                Mật khẩu mới
              </Label>
              <Input
                id="new-password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="confirm-password" className="mb-2">
                Xác nhận mật khẩu mới
              </Label>
              <Input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                maxLength={100}
              />
            </div>
            {passwordState.error && (
              <p className="text-red-500 text-sm">{passwordState.error}</p>
            )}
            {passwordState.success && (
              <p className="text-green-500 text-sm">{passwordState.success}</p>
            )}
            <Button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={isPasswordPending}
            >
              {isPasswordPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang cập nhật...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Cập nhật mật khẩu
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Xóa tài khoản</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Việc xóa tài khoản không thể hoàn tác. Vui lòng thận trọng khi thực hiện.
          </p>
          <form action={deleteAction} className="space-y-4">
            <div>
              <Label htmlFor="delete-password" className="mb-2">
                Xác nhận mật khẩu
              </Label>
              <Input
                id="delete-password"
                name="password"
                type="password"
                required
                minLength={8}
                maxLength={100}
              />
            </div>
            {deleteState.error && (
              <p className="text-red-500 text-sm">{deleteState.error}</p>
            )}
            <Button
              type="submit"
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeletePending}
            >
              {isDeletePending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Xóa tài khoản
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Team Tab
function TeamTab() {
  const { data: teamData } = useSWR<TeamDataWithMembers>('/api/team', fetcher);
  const { data: user } = useSWR<User>('/api/user', fetcher);

  const [removeState, removeAction, isRemovePending] = useActionState<
    ActionState,
    FormData
  >(removeTeamMember, {});

  const [inviteState, inviteAction, isInvitePending] = useActionState<
    ActionState,
    FormData
  >(inviteTeamMember, {});

  const isOwner = user?.role === 'owner';

  const getUserDisplayName = (user: Pick<User, 'id' | 'name' | 'email'>) => {
    return user.name || user.email || 'Unknown User';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gói dịch vụ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div className="mb-4 sm:mb-0">
                <p className="font-medium">
                  Gói hiện tại: {teamData?.planName || 'Miễn phí'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {teamData?.subscriptionStatus === 'active'
                    ? 'Thanh toán hàng tháng'
                    : teamData?.subscriptionStatus === 'trialing'
                    ? 'Đang dùng thử'
                    : 'Chưa có gói đăng ký'}
                </p>
              </div>
              <form action={customerPortalAction}>
                <Button type="submit" variant="outline">
                  Quản lý gói dịch vụ
                </Button>
              </form>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thành viên nhóm</CardTitle>
        </CardHeader>
        <CardContent>
          {teamData?.teamMembers && teamData.teamMembers.length > 0 ? (
            <ul className="space-y-4">
              {teamData.teamMembers.map((member, index) => (
                <li key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarFallback>
                        {getUserDisplayName(member.user)
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {getUserDisplayName(member.user)}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {member.role}
                      </p>
                    </div>
                  </div>
                  {index > 1 && (
                    <form action={removeAction}>
                      <input type="hidden" name="memberId" value={member.id} />
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        disabled={isRemovePending}
                      >
                        {isRemovePending ? 'Đang xóa...' : 'Xóa'}
                      </Button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Chưa có thành viên nào.</p>
          )}
          {removeState?.error && (
            <p className="text-red-500 mt-4">{removeState.error}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mời thành viên mới</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={inviteAction} className="space-y-4">
            <div>
              <Label htmlFor="invite-email" className="mb-2">
                Email
              </Label>
              <Input
                id="invite-email"
                name="email"
                type="email"
                placeholder="Nhập email"
                required
                disabled={!isOwner}
              />
            </div>
            <div>
              <Label>Vai trò</Label>
              <RadioGroup
                defaultValue="member"
                name="role"
                className="flex space-x-4"
                disabled={!isOwner}
              >
                <div className="flex items-center space-x-2 mt-2">
                  <RadioGroupItem value="member" id="member" />
                  <Label htmlFor="member">Thành viên</Label>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <RadioGroupItem value="owner" id="owner" />
                  <Label htmlFor="owner">Quản lý</Label>
                </div>
              </RadioGroup>
            </div>
            {inviteState?.error && (
              <p className="text-red-500">{inviteState.error}</p>
            )}
            {inviteState?.success && (
              <p className="text-green-500">{inviteState.success}</p>
            )}
            <Button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={isInvitePending || !isOwner}
            >
              {isInvitePending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang mời...
                </>
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Mời thành viên
                </>
              )}
            </Button>
          </form>
          {!isOwner && (
            <p className="text-sm text-muted-foreground mt-4">
              Bạn cần là quản lý nhóm để mời thành viên mới.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <section className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Cài đặt</h1>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="general">Chung</TabsTrigger>
          <TabsTrigger value="security">Bảo mật</TabsTrigger>
          <TabsTrigger value="team">Nhóm</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Suspense fallback={<div>Đang tải...</div>}>
            <GeneralTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <SecurityTab />
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <Suspense fallback={<div>Đang tải...</div>}>
            <TeamTab />
          </Suspense>
        </TabsContent>
      </Tabs>
    </section>
  );
}
