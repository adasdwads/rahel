import 'package:flutter/material.dart';

import '../config/app_theme.dart';

class StatusIndicator extends StatelessWidget {
  final bool isActive;
  final String label;
  final double size;

  const StatusIndicator({
    super.key,
    required this.isActive,
    required this.label,
    this.size = 10,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: isActive ? Colors.greenAccent : Colors.redAccent,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: (isActive ? Colors.greenAccent : Colors.redAccent).withOpacity(0.4),
                blurRadius: 6,
                spreadRadius: 1,
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppTheme.textSecondary,
              ),
        ),
      ],
    );
  }
}
