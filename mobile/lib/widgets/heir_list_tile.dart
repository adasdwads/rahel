import 'package:flutter/material.dart';

import '../config/app_theme.dart';

class HeirListTile extends StatelessWidget {
  final Map<String, dynamic> heir;
  final VoidCallback? onDelete;
  final VoidCallback? onAssign;

  const HeirListTile({
    super.key,
    required this.heir,
    this.onDelete,
    this.onAssign,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      color: AppTheme.cardBackground,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: AppTheme.accent.withOpacity(0.15),
          child: const Icon(Icons.person_rounded, color: AppTheme.accent),
        ),
        title: Text(
          heir['recipientName'] ?? 'وريث',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        subtitle: Text(
          '${heir['relationship'] ?? ''} ${heir['phone'] ?? ''}',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        trailing: PopupMenuButton<String>(
          color: AppTheme.cardBackground,
          icon: const Icon(Icons.more_vert_rounded, color: AppTheme.textSecondary),
          onSelected: (value) {
            if (value == 'assign') onAssign?.call();
            if (value == 'delete') onDelete?.call();
          },
          itemBuilder: (context) => [
            const PopupMenuItem(value: 'assign', child: Text('تعيين مفتاح')),
            const PopupMenuItem(value: 'delete', child: Text('حذف')),
          ],
        ),
      ),
    );
  }
}
