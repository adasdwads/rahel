import 'package:flutter/material.dart';

import '../config/app_theme.dart';

class EncryptedFileCard extends StatelessWidget {
  final Map<String, dynamic> file;
  final VoidCallback? onDownload;
  final VoidCallback? onDelete;
  final VoidCallback? onAssign;

  const EncryptedFileCard({
    super.key,
    required this.file,
    this.onDownload,
    this.onDelete,
    this.onAssign,
  });

  IconData get _icon {
    final type = (file['fileType'] as String? ?? '').toLowerCase();
    if (type.startsWith('image/')) return Icons.image_rounded;
    if (type.startsWith('video/')) return Icons.videocam_rounded;
    if (type.startsWith('audio/')) return Icons.audiotrack_rounded;
    if (type.contains('pdf')) return Icons.picture_as_pdf_rounded;
    return Icons.insert_drive_file_rounded;
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      color: AppTheme.cardBackground,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: AppTheme.accent.withOpacity(0.15),
              child: Icon(_icon, color: AppTheme.accent),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    file['fileName'] ?? 'ملف مشفر',
                    style: Theme.of(context).textTheme.titleMedium,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '${file['formattedSize'] ?? file['fileSizeBytes'] ?? ''} • ${file['accessTier'] ?? ''}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  if (file['description']?.toString().isNotEmpty ?? false)
                    Text(
                      file['description'].toString(),
                      style: Theme.of(context).textTheme.bodySmall,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                ],
              ),
            ),
            PopupMenuButton<String>(
              color: AppTheme.cardBackground,
              icon: const Icon(Icons.more_vert_rounded, color: AppTheme.textSecondary),
              onSelected: (value) {
                switch (value) {
                  case 'download':
                    onDownload?.call();
                    break;
                  case 'assign':
                    onAssign?.call();
                    break;
                  case 'delete':
                    onDelete?.call();
                    break;
                }
              },
              itemBuilder: (context) => [
                const PopupMenuItem(value: 'download', child: Text('فك التشفير والتنزيل')),
                const PopupMenuItem(value: 'assign', child: Text('تعيين جزء للوريث')),
                const PopupMenuItem(value: 'delete', child: Text('حذف')),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
