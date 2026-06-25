import 'package:flutter/material.dart';

import '../config/app_theme.dart';

class CharityFlowCard extends StatelessWidget {
  final Map<String, dynamic> flow;
  final VoidCallback? onFund;
  final VoidCallback? onToggle;
  final VoidCallback? onDelete;

  const CharityFlowCard({
    super.key,
    required this.flow,
    this.onFund,
    this.onToggle,
    this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final isActive = flow['isActive'] == 1 || flow['isActive'] == true;
    final walletBalance = (flow['walletBalance'] as num?)?.toDouble() ?? 0.0;
    final recurringAmount = (flow['recurringAmount'] as num?)?.toDouble() ?? 0.0;

    return Card(
      color: AppTheme.cardBackground,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: AppTheme.accent.withOpacity(0.15),
                  child: const Icon(Icons.volunteer_activism_rounded, color: AppTheme.accent),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        flow['charityName'] ?? 'صدقة جارية',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      Text(
                        '${flow['frequency'] ?? 'monthly'} • ${_statusLabel(isActive)}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                PopupMenuButton<String>(
                  color: AppTheme.cardBackground,
                  icon: const Icon(Icons.more_vert_rounded, color: AppTheme.textSecondary),
                  onSelected: (value) {
                    switch (value) {
                      case 'fund':
                        onFund?.call();
                        break;
                      case 'toggle':
                        onToggle?.call();
                        break;
                      case 'delete':
                        onDelete?.call();
                        break;
                    }
                  },
                  itemBuilder: (context) => [
                    const PopupMenuItem(value: 'fund', child: Text('تمويل المحفظة')),
                    PopupMenuItem(
                      value: 'toggle',
                      child: Text(isActive ? 'إيقاف مؤقت' : 'تفعيل'),
                    ),
                    const PopupMenuItem(value: 'delete', child: Text('حذف')),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 14),
            _infoRow('المبلغ الدوري:', '${recurringAmount.toStringAsFixed(2)} AED'),
            const SizedBox(height: 6),
            _infoRow('رصيد المحفظة:', '${walletBalance.toStringAsFixed(2)} AED'),
          ],
        ),
      ),
    );
  }

  String _statusLabel(bool active) => active ? 'نشط' : 'متوقف';

  Widget _infoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: AppTheme.textSecondary)),
        Text(
          value,
          style: const TextStyle(
            color: AppTheme.textPrimary,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
