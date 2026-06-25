import 'package:flutter/material.dart';

import '../config/app_theme.dart';

class SelfDestructChecklist extends StatelessWidget {
  final List<dynamic> items;
  final ValueChanged<String>? onConfirm;
  final ValueChanged<String>? onDelete;

  const SelfDestructChecklist({
    super.key,
    required this.items,
    this.onConfirm,
    this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'بروتوكول التدمير الذاتي',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        ...items.map((item) {
          final confirmed = item['confirmed'] == 1 || item['confirmed'] == true;
          return Card(
            color: AppTheme.cardBackground,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            child: ListTile(
              leading: Checkbox(
                value: confirmed,
                activeColor: AppTheme.accent,
                onChanged: confirmed
                    ? null
                    : (_) => onConfirm?.call(item['itemID'].toString()),
              ),
              title: Text(
                item['description'] ?? 'عنصر',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              subtitle: Text(
                'النوع: ${item['targetType'] ?? '-'}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              trailing: IconButton(
                icon: const Icon(Icons.delete_outline_rounded, color: Colors.redAccent),
                onPressed: () => onDelete?.call(item['itemID'].toString()),
              ),
            ),
          );
        }),
      ],
    );
  }
}
