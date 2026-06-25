import 'package:flutter/material.dart';
import 'package:provider/provider.dart';



import '../config/app_theme.dart';
import '../providers/charity_provider.dart';
import '../providers/heartbeat_provider.dart';
import '../providers/vault_provider.dart';
import '../providers/capsule_provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/main_navigation_controller.dart';
import '../widgets/quick_action_tile.dart';
import '../widgets/status_indicator.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  void Function(int)? onNavigateToTab;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<VaultProvider>().loadFiles();
      context.read<CharityProvider>().loadFlows();
      context.read<CapsuleProvider>().loadCapsules();
      context.read<HeartbeatProvider>().loadStatus();
    });
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      color: AppTheme.accent,
      backgroundColor: AppTheme.secondaryBackground,
      onRefresh: () async {
        await Future.wait([
          context.read<VaultProvider>().loadFiles(),
          context.read<CharityProvider>().loadFlows(),
          context.read<CapsuleProvider>().loadCapsules(),
          context.read<HeartbeatProvider>().loadStatus(),
        ]);
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildProfileCard(),
            const SizedBox(height: 16),
            _buildHeartbeatCard(),
            const SizedBox(height: 20),
            _buildStatsGrid(),
            const SizedBox(height: 24),
            Text(
              'إجراءات سريعة',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            _buildQuickActions(),
            const SizedBox(height: 24),
            Text(
              'آخر النشاطات',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            _buildRecentActivity(),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileCard() {
    return Consumer<AuthProvider>(
      builder: (context, authProvider, _) {
        final user = authProvider.user ?? const <String, dynamic>{};
        return Card(
          color: AppTheme.cardBackground,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: AppTheme.accent.withOpacity(0.15),
              child: const Icon(Icons.person_rounded, color: AppTheme.accent),
            ),
            title: Text(user['name']?.toString() ?? 'مستخدم Rahel'),
            subtitle: Text(user['email']?.toString() ?? ''),
            trailing: TextButton.icon(
              onPressed: () => _showProfileSheet(context, user),
              icon: const Icon(Icons.manage_accounts_rounded),
              label: const Text('الملف الشخصي'),
            ),
          ),
        );
      },
    );
  }

  void _showProfileSheet(BuildContext context, Map<String, dynamic> user) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.cardBackground,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('الملف الشخصي', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            Text('الاسم: ${user['name'] ?? '-'}'),
            const SizedBox(height: 8),
            Text('البريد: ${user['email'] ?? '-'}'),
            const SizedBox(height: 8),
            Text('الهاتف: ${user['phone'] ?? '-'}'),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('إغلاق'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeartbeatCard() {
    return Consumer<HeartbeatProvider>(
      builder: (context, provider, _) {
        final status = provider.status;
        final days = provider.daysUntilTrigger;
        final isOverdue = provider.isOverdue;

        return Card(
          color: isOverdue ? Colors.redAccent.withOpacity(0.12) : AppTheme.cardBackground,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'نبض الحياة',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    if (status != null)
                      StatusIndicator(
                        isActive: !isOverdue,
                        label: isOverdue ? 'متأخر' : 'نشط',
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  status == null
                      ? 'جاري تحميل حالة النبض...'
                      : isOverdue
                          ? 'لم يتم تأكيد النبض. يرجى تأكيد نشاطك الآن لتجنب تفعيل البروتوكولات.'
                          : 'حالتك نشطة. ${days != null ? 'الأيام المتبقية للتفعيل: $days' : ''}',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: provider.isLoading ? null : () => _acknowledge(context),
                    icon: const Icon(Icons.favorite_rounded),
                    label: const Text('أنا بخير - تأكيد النبض'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isOverdue ? Colors.redAccent : AppTheme.accent,
                      foregroundColor: AppTheme.buttonForeground,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _acknowledge(BuildContext context) async {
    final provider = context.read<HeartbeatProvider>();
    try {
      await provider.acknowledge();
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تم تأكيد النبض بنجاح')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('خطأ: ${e.toString().replaceFirst('Exception: ', '')}')),
        );
      }
    }
  }

  Widget _buildStatsGrid() {
    return Consumer4<VaultProvider, CharityProvider, CapsuleProvider, HeartbeatProvider>(
      builder: (context, vault, charity, capsule, heartbeat, _) {
        final fileCount = vault.files.length;
        final flowCount = charity.flows.cast<Map<String, dynamic>>().where((f) => f['isActive'] == 1 || f['isActive'] == true).length;
        final pendingCapsules = capsule.capsules.cast<Map<String, dynamic>>().where((c) => c['delivered'] != true && c['delivered'] != 1).length;
        final status = heartbeat.status?['status']?.toString() ?? 'Active';

        return GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 2,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.45,
          children: [
            _statCard('الملفات المشفرة', fileCount.toString(), Icons.lock_rounded),
            _statCard('التدفقات الخيرية', flowCount.toString(), Icons.favorite_rounded),
            _statCard('كبسولات قيد الانتظار', pendingCapsules.toString(), Icons.hourglass_bottom_rounded),
            _statCard('حالة الحساب', status == 'Active' ? 'نشط' : status, Icons.verified_user_rounded),
          ],
        );
      },
    );
  }

  Widget _statCard(String label, String value, IconData icon) {
    return Card(
      color: AppTheme.cardBackground,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Icon(icon, color: AppTheme.accent, size: 28),
            Text(
              value,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 26),
            ),
            Text(label, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActions() {
    final actions = [
      QuickActionTile(
        icon: Icons.upload_file_rounded,
        title: 'رفع ملف',
        subtitle: 'إضافة ملف مشفر إلى الخزنة',
        onTap: () => _navigateToTab(1),
      ),
      QuickActionTile(
        icon: Icons.volunteer_activism_rounded,
        title: 'صدقة جارية',
        subtitle: 'إنشاء تدفق خيري جديد',
        onTap: () => _navigateToTab(2),
      ),
      QuickActionTile(
        icon: Icons.schedule_send_rounded,
        title: 'كبسولة جديدة',
        subtitle: 'رسالة مستقبلية للأحباء',
        onTap: () => _navigateToTab(3),
      ),
      QuickActionTile(
        icon: Icons.people_alt_rounded,
        title: 'إدارة الورثة',
        subtitle: 'المستفيدون والمفاتيح',
        onTap: () => _navigateToTab(4),
      ),
    ];

    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.1,
      children: actions,
    );
  }

  void _navigateToTab(int index) {
    MainNavigationController.of(context)?.goToTab(index);
  }

  Widget _buildRecentActivity() {
    return Consumer3<VaultProvider, CapsuleProvider, CharityProvider>(
      builder: (context, vault, capsule, charity, _) {
        if (vault.isLoading || capsule.isLoading || charity.isLoading) {
          return const Center(child: CircularProgressIndicator());
        }

        final recentFiles = vault.files.take(3).cast<Map<String, dynamic>>().toList();
        final recentCapsules = capsule.capsules.take(2).cast<Map<String, dynamic>>().toList();

        if (recentFiles.isEmpty && recentCapsules.isEmpty) {
          return _emptyState('لا توجد نشاطات حديثة');
        }

        return Column(
          children: [
            ...recentFiles.map((file) => _activityTile(
                  icon: Icons.lock_rounded,
                  title: file['fileName'] ?? 'ملف مشفر',
                  subtitle: file['formattedSize'] ?? '',
                )),
            ...recentCapsules.map((cap) => _activityTile(
                  icon: Icons.schedule_send_rounded,
                  title: cap['title'] ?? 'كبسولة زمنية',
                  subtitle: cap['recipientName'] ?? cap['recipientContact'] ?? '',
                )),
          ],
        );
      },
    );
  }

  Widget _activityTile({
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Card(
      color: AppTheme.cardBackground,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: AppTheme.accent.withOpacity(0.15),
          child: Icon(icon, color: AppTheme.accent),
        ),
        title: Text(title, style: Theme.of(context).textTheme.titleMedium),
        subtitle: Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
      ),
    );
  }

  Widget _emptyState(String message) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 28),
      decoration: BoxDecoration(
        color: AppTheme.cardBackground,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          const Icon(Icons.inbox_rounded, color: AppTheme.textSecondary, size: 40),
          const SizedBox(height: 10),
          Text(message, style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}
