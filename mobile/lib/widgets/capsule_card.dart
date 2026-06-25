import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../config/app_theme.dart';

class CapsuleCard extends StatelessWidget {
  final Map<String, dynamic> capsule;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;

  const CapsuleCard({
    super.key,
    required this.capsule,
    this.onEdit,
    this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final delivered = capsule['delivered'] == 1 || capsule['delivered'] == true;
    final releaseDate = _parseDate(capsule['targetReleaseDate']);

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
                  child: Icon(
                    delivered ? Icons.done_all_rounded : Icons.schedule_send_rounded,
                    color: delivered ? Colors.greenAccent : AppTheme.accent,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        capsule['title'] ?? 'كبسولة زمنية',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      Text(
                        delivered ? 'تم التسليم' : 'في الانتظار',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                if (!delivered)
                  PopupMenuButton<String>(
                    color: AppTheme.cardBackground,
                    icon: const Icon(Icons.more_vert_rounded, color: AppTheme.textSecondary),
                    onSelected: (value) {
                      if (value == 'edit') onEdit?.call();
                      if (value == 'delete') onDelete?.call();
                    },
                    itemBuilder: (context) => [
                      const PopupMenuItem(value: 'edit', child: Text('تعديل')),
                      const PopupMenuItem(value: 'delete', child: Text('حذف')),
                    ],
                  ),
              ],
            ),
            const SizedBox(height: 14),
            _infoRow('المستلم:', capsule['recipientName'] ?? capsule['recipientContact'] ?? '-'),
            const SizedBox(height: 6),
            _infoRow('تاريخ الإرسال:', releaseDate != null
                ? DateFormat.yMMMd('ar').add_jm().format(releaseDate)
                : '-'),
            if (capsule['occasion']?.toString().isNotEmpty ?? false) ...[
              const SizedBox(height: 6),
              _infoRow('المناسبة:', capsule['occasion'].toString()),
            ],
          ],
        ),
      ),
    );
  }

  DateTime? _parseDate(dynamic value) {
    if (value == null) return null;
    try {
      return DateTime.parse(value.toString());
    } catch (_) {
      return null;
    }
  }

  Widget _infoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: AppTheme.textSecondary)),
        Expanded(
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w500),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
