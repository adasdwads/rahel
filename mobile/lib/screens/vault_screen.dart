import 'dart:io';

import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:provider/provider.dart';

import '../config/app_theme.dart';
import '../providers/vault_provider.dart';
import '../widgets/encrypted_file_card.dart';
import '../widgets/heir_list_tile.dart';

class VaultScreen extends StatefulWidget {
  const VaultScreen({super.key});

  @override
  State<VaultScreen> createState() => _VaultScreenState();
}

class _VaultScreenState extends State<VaultScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<VaultProvider>().loadFiles();
      context.read<VaultProvider>().loadHeirs();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          TabBar(
            controller: _tabController,
            indicatorColor: AppTheme.accent,
            labelColor: AppTheme.accent,
            unselectedLabelColor: AppTheme.textSecondary,
            tabs: const [
              Tab(text: 'الملفات', icon: Icon(Icons.lock_rounded)),
              Tab(text: 'الورثة', icon: Icon(Icons.people_rounded)),
            ],
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildFilesTab(),
                _buildHeirsTab(),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _pickAndUploadFile(context),
        backgroundColor: AppTheme.accent,
        icon: const Icon(Icons.add_rounded, color: AppTheme.textPrimary),
        label: const Text('رفع ملف', style: TextStyle(color: AppTheme.textPrimary)),
      ),
    );
  }

  Widget _buildFilesTab() {
    return Consumer<VaultProvider>(
      builder: (context, provider, _) {
        if (provider.isLoading && provider.files.isEmpty) {
          return const Center(child: CircularProgressIndicator());
        }

        if (provider.error != null) {
          return _errorState(provider.error!, () => provider.loadFiles());
        }

        if (provider.files.isEmpty) {
          return _emptyState(
            icon: Icons.lock_outline_rounded,
            message: 'الخزنة فارغة',
            subMessage: 'ارفع أول ملف مشفر لحماية أصولك الرقمية.',
            actionLabel: 'رفع ملف',
            onAction: () => _pickAndUploadFile(context),
          );
        }

        return RefreshIndicator(
          color: AppTheme.accent,
          backgroundColor: AppTheme.cardBackground,
          onRefresh: () => provider.loadFiles(),
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: provider.files.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final file = provider.files[index] as Map<String, dynamic>;
              return EncryptedFileCard(
                file: file,
                onDownload: () => _downloadFile(context, file['fileID'].toString(), file['fileName'].toString()),
                onDelete: () => _confirmDeleteFile(context, file['fileID'].toString()),
                onAssign: () => _showAssignShardDialog(context, file),
              );
            },
          ),
        );
      },
    );
  }

  Widget _buildHeirsTab() {
    return Consumer<VaultProvider>(
      builder: (context, provider, _) {
        if (provider.isLoading && provider.heirs.isEmpty) {
          return const Center(child: CircularProgressIndicator());
        }

        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _showAddHeirDialog(context),
                  icon: const Icon(Icons.person_add_rounded),
                  label: const Text('إضافة وريث'),
                  style: _elevatedStyle(),
                ),
              ),
            ),
            Expanded(
              child: provider.heirs.isEmpty
                  ? _emptyState(
                      icon: Icons.people_outline_rounded,
                      message: 'لا يوجد ورثة مسجلين',
                      subMessage: 'أضف مستفيدين موثوقين للوصول إلى مفاتيح الخزنة.',
                      actionLabel: 'إضافة وريث',
                      onAction: () => _showAddHeirDialog(context),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: provider.heirs.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final heir = provider.heirs[index] as Map<String, dynamic>;
                        return HeirListTile(
                          heir: heir,
                          onAssign: () => _showAssignShardToHeirDialog(
                            context,
                            heir['recipientID'].toString(),
                          ),
                          onDelete: () => _confirmDeleteHeir(context, heir['recipientID'].toString()),
                        );
                      },
                    ),
            ),
          ],
        );
      },
    );
  }

  Future<void> _pickAndUploadFile(BuildContext context) async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.any,
      allowMultiple: false,
      withData: false,
    );

    if (result == null || result.files.single.path == null) return;

    final file = File(result.files.single.path!);
    final provider = context.read<VaultProvider>();

    try {
      await provider.uploadFile(file: file);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تم رفع وتشفير الملف بنجاح')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('فشل الرفع: ${e.toString().replaceFirst('Exception: ', '')}')),
        );
      }
    }
  }

  Future<void> _downloadFile(BuildContext context, String fileID, String fileName) async {
    // In a full production app, save decrypted bytes to Downloads via path_provider/share_plus.
    // Here we invoke the service and show a success confirmation.
    final provider = context.read<VaultProvider>();
    try {
      await provider.fetchFileDetails(fileID);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('جاري تنزيل $fileName...')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('فشل التنزيل: ${e.toString().replaceFirst('Exception: ', '')}')),
        );
      }
    }
  }

  void _confirmDeleteFile(BuildContext context, String fileID) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.cardBackground,
        title: const Text('حذف الملف'),
        content: const Text('هل أنت متأكد من حذف هذا الملف نهائيًا؟'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('إلغاء'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await context.read<VaultProvider>().deleteFile(fileID);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('تم حذف الملف')),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('فشل الحذف: ${e.toString().replaceFirst('Exception: ', '')}')),
                  );
                }
              }
            },
            child: const Text('حذف', style: TextStyle(color: Colors.redAccent)),
          ),
        ],
      ),
    );
  }

  void _showAddHeirDialog(BuildContext context) {
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final relationCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.cardBackground,
        title: const Text('إضافة وريث'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _textField(nameCtrl, 'الاسم الكامل'),
              const SizedBox(height: 10),
              _textField(phoneCtrl, 'رقم الهاتف'),
              const SizedBox(height: 10),
              _textField(emailCtrl, 'البريد الإلكتروني (اختياري)'),
              const SizedBox(height: 10),
              _textField(relationCtrl, 'صلة القرابة'),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء')),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await context.read<VaultProvider>().addHeir(
                      recipientName: nameCtrl.text.trim(),
                      phone: phoneCtrl.text.trim(),
                      email: emailCtrl.text.trim().isEmpty ? null : emailCtrl.text.trim(),
                      relationship: relationCtrl.text.trim().isEmpty ? null : relationCtrl.text.trim(),
                    );
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('تمت إضافة الوريث')),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('فشل الإضافة: ${e.toString().replaceFirst('Exception: ', '')}')),
                  );
                }
              }
            },
            child: const Text('حفظ'),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteHeir(BuildContext context, String recipientID) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.cardBackground,
        title: const Text('حذف وريث'),
        content: const Text('هل أنت متأكد من حذف هذا الوريث؟'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء')),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await context.read<VaultProvider>().deleteHeir(recipientID);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('تم حذف الوريث')),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('فشل الحذف: ${e.toString().replaceFirst('Exception: ', '')}')),
                  );
                }
              }
            },
            child: const Text('حذف', style: TextStyle(color: Colors.redAccent)),
          ),
        ],
      ),
    );
  }

  void _showAssignShardDialog(BuildContext context, Map<String, dynamic> file) {
    final provider = context.read<VaultProvider>();
    final shards = (file['keyShardLocations'] as List<dynamic>? ?? []);

    if (provider.heirs.isEmpty || shards.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('لا يوجد ورثة أو أجزاء للتعيين')),
      );
      return;
    }

    String? selectedHeir;
    int? selectedShardIndex;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.cardBackground,
        title: const Text('تعيين جزء مشفر'),
        content: StatefulBuilder(
          builder: (context, setState) {
            return Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<String>(
                  decoration: const InputDecoration(labelText: 'اختر الوريث'),
                  value: selectedHeir,
                  dropdownColor: AppTheme.cardBackground,
                  items: provider.heirs.cast<Map<String, dynamic>>().map((h) {
                    return DropdownMenuItem(
                      value: h['recipientID'].toString(),
                      child: Text(h['recipientName'].toString()),
                    );
                  }).toList(),
                  onChanged: (v) => setState(() => selectedHeir = v),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<int>(
                  decoration: const InputDecoration(labelText: 'اختر الجزء'),
                  value: selectedShardIndex,
                  dropdownColor: AppTheme.cardBackground,
                  items: shards.asMap().entries.map((entry) {
                    return DropdownMenuItem(
                      value: entry.key,
                      child: Text('جزء ${entry.value['index'] ?? entry.key + 1}'),
                    );
                  }).toList(),
                  onChanged: (v) => setState(() => selectedShardIndex = v),
                ),
              ],
            );
          },
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء')),
          TextButton(
            onPressed: () async {
              if (selectedHeir == null || selectedShardIndex == null) return;
              Navigator.pop(ctx);
              try {
                final details = await provider.fetchFileDetails(file['fileID'].toString());
                final shardList = details['shards'] as List<dynamic>? ?? [];
                if (selectedShardIndex! < shardList.length) {
                  final shardID = shardList[selectedShardIndex!]['shardID'].toString();
                  await provider.assignShard(shardID: shardID, recipientID: selectedHeir!);
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('تم تعيين الجزء للوريث')),
                    );
                  }
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('فشل التعيين: ${e.toString().replaceFirst('Exception: ', '')}')),
                  );
                }
              }
            },
            child: const Text('تعيين'),
          ),
        ],
      ),
    );
  }

  void _showAssignShardToHeirDialog(BuildContext context, String recipientID) {
    final provider = context.read<VaultProvider>();
    if (provider.files.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('لا توجد ملفات لتعيين أجزائها')),
      );
      return;
    }

    String? selectedFileID;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.cardBackground,
        title: const Text('تعيين مفتاح للوريث'),
        content: StatefulBuilder(
          builder: (context, setState) {
            return DropdownButtonFormField<String>(
              decoration: const InputDecoration(labelText: 'اختر الملف'),
              value: selectedFileID,
              dropdownColor: AppTheme.cardBackground,
              items: provider.files.cast<Map<String, dynamic>>().map((f) {
                return DropdownMenuItem(
                  value: f['fileID'].toString(),
                  child: Text(f['fileName'].toString()),
                );
              }).toList(),
              onChanged: (v) => setState(() => selectedFileID = v),
            );
          },
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء')),
          TextButton(
            onPressed: () async {
              if (selectedFileID == null) return;
              Navigator.pop(ctx);
              try {
                final details = await provider.fetchFileDetails(selectedFileID!);
                final shardList = details['shards'] as List<dynamic>? ?? [];
                if (shardList.isNotEmpty) {
                  final shardID = shardList.first['shardID'].toString();
                  await provider.assignShard(shardID: shardID, recipientID: recipientID);
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('تم تعيين المفتاح')),
                    );
                  }
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('فشل التعيين: ${e.toString().replaceFirst('Exception: ', '')}')),
                  );
                }
              }
            },
            child: const Text('تعيين'),
          ),
        ],
      ),
    );
  }

  Widget _textField(TextEditingController controller, String label) {
    return TextField(
      controller: controller,
      decoration: InputDecoration(
        labelText: label,
        filled: true,
        fillColor: AppTheme.primaryBackground,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }

  ButtonStyle _elevatedStyle() {
    return ElevatedButton.styleFrom(
      backgroundColor: AppTheme.accent,
      foregroundColor: AppTheme.textPrimary,
      padding: const EdgeInsets.symmetric(vertical: 14),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    );
  }

  Widget _errorState(String message, VoidCallback onRetry) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline_rounded, color: Colors.redAccent, size: 48),
          const SizedBox(height: 12),
          Text(message, textAlign: TextAlign.center),
          const SizedBox(height: 12),
          ElevatedButton(onPressed: onRetry, child: const Text('إعادة المحاولة')),
        ],
      ),
    );
  }

  Widget _emptyState({
    required IconData icon,
    required String message,
    required String subMessage,
    required String actionLabel,
    required VoidCallback onAction,
  }) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: AppTheme.textSecondary, size: 64),
            const SizedBox(height: 16),
            Text(message, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(subMessage,
                textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: onAction,
              icon: const Icon(Icons.add_rounded),
              label: Text(actionLabel),
              style: _elevatedStyle(),
            ),
          ],
        ),
      ),
    );
  }
}
