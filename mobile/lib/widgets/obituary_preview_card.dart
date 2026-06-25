import 'package:flutter/material.dart';

import '../config/app_theme.dart';

class ObituaryPreviewCard extends StatelessWidget {
  final String? platform;
  final String? obituaryText;
  final String? donationLink;

  const ObituaryPreviewCard({
    super.key,
    this.platform,
    this.obituaryText,
    this.donationLink,
  });

  @override
  Widget build(BuildContext context) {
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
                const Icon(Icons.article_rounded, color: AppTheme.accent),
                const SizedBox(width: 10),
                Text(
                  'معاينة النعي',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppTheme.primaryBackground,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                obituaryText?.isNotEmpty == true
                    ? obituaryText!
                    : 'بقلوب مؤمنة بقضاء الله وقدره، ننعى فقيدنا/فقيدتنا. للتبرع باسمه يرجى زيارة الرابط أدناه.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(height: 1.6),
              ),
            ),
            if (donationLink?.isNotEmpty == true) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  const Icon(Icons.link_rounded, color: AppTheme.textSecondary, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      donationLink!,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppTheme.accent),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ],
            if (platform?.isNotEmpty == true) ...[
              const SizedBox(height: 10),
              Text(
                'المنصة: $platform',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
