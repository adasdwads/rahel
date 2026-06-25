import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';

import '../config/app_config.dart';
import '../config/app_theme.dart';
import '../providers/vault_provider.dart';
import '../services/auth_service.dart';
import '../widgets/heir_list_tile.dart';
import '../widgets/obituary_preview_card.dart';
import '../widgets/self_destruct_checklist.dart';

class SocialLegacyScreen extends StatefulWidget {
  const SocialLegacyScreen({super.key});

  @override
  State<SocialLegacyScreen> createState() => _SocialLegacyScreenState();
}

class _SocialLegacyScreenState extends State<SocialLegacyScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = false;
  String? _error;
  List<dynamic> _configs = [];
  List<dynamic> _destructItems = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<VaultProvider>().loadHeirs();
      _loadConfigs();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<Map<String, String>> _headers() async {
    final session = await AuthService().restoreSession();
    final token = session?['accessToken'] as String?;
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<void> _loadConfigs() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final response = await http.get(
        Uri.parse('${AppConfig.baseUrl}/social-legacy/configs'),
        headers: await _headers(),
      );
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      _configs = (data['socialConfigs'] as List<dynamic>? ?? []).cast<Map<String, dynamic>>();
      _destructItems = (data['selfDestructItems'] as List<dynamic>? ?? []).cast<Map<String, dynamic>>();
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _savePlatform(String platform, String obituary, {String? donationLink}) async {
    setState(() => _isLoading = true);
    try {
      await http.post(
        Uri.parse('${AppConfig.baseUrl}/social-legacy/platform'),
        headers: await _headers(),
        body: jsonEncode({
          'platform': platform,
          'obituaryText': obituary,
          'donationLink': donationLink,
        }),
      );
      await _loadConfigs();
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تم حفظ إعدادات المنصة')),
        );
      }
    } catch (e) {
      setState(() => _isLoading = false);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('فشل الحفظ: ${e.toString().replaceFirst('Exception: ', '')}')),
        );
      }
    }
  }

  Future<void> _deleteConfig(String configID) async {
    setState(() => _isLoading = true);
    try {
      await http.delete(
        Uri.parse('${AppConfig.baseUrl}/social-legacy/platform/$configID'),
        headers: await _headers(),
      );
      await _loadConfigs();
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _addDestructItem(String targetType, String description, int priority) async {
    setState(() => _isLoading = true);
    try {
      await http.post(
        Uri.parse('${AppConfig.baseUrl}/social-legacy/self-destruct/add'),
        headers: await _headers(),
        body: jsonEncode({
          'targetType': targetType,
          'description': description,
          'priority': priority,
        }),
      );
      await _loadConfigs();
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _confirmDestructItem(String itemID) async {
    setState(() => _isLoading = true);
    try {
      await http.put(
        Uri.parse('${AppConfig.baseUrl}/social-legacy/self-destruct/$itemID/confirm'),
        headers: await _headers(),
      );
      await _loadConfigs();
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _deleteDestructItem(String itemID) async {
    setState(() => _isLoading = true);
    try {
      await http.delete(
        Uri.parse('${AppConfig.baseUrl}/social-legacy/self-destruct/$itemID'),
        headers: await _headers(),
      );
      await _loadConfigs();
    } catch (e) {
      setState(() => _isLoading = false);
    }
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
              Tab(text: 'الورثة', icon: Icon(Icons.people_rounded)),
              Tab(text: 'المنصات', icon: Icon(Icons.share_rounded)),
              Tab(text: 'التدمير الذاتي', icon: Icon(Icons.delete_forever_rounded)),
            ],
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildHeirsTab(),
                _buildPlatformsTab(),
                _buildDestructTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeirsTab() {
    return Consumer<VaultProvider>(
      builder: (context, provider, _) {
        if (provider.isLoading && provider.heirs.isEmpty) {
          return const Center(child: CircularProgressIndicator());
        }

        if (provider.heirs.isEmpty) {
          return _emptyState(
            icon: Icons.people_outline_rounded,
            message: 'لا يوجد ورثة',
            subMessage: 'أضف مستفيدين من الرئيسية أو الخزنة.',
          );
        }

        return RefreshIndicator(
          color: AppTheme.accent,
          backgroundColor: AppTheme.cardBackground,
          onRefresh: () => provider.loadHeirs(),
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: provider.heirs.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final heir = provider.heirs[index] as Map<String, dynamic>;
              return HeirListTile(
                heir: heir,
                onAssign: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('استخدم تبويب الخزنة لتعيين المفاتيح')),
                  );
                },
              );
            },
          ),
        );
      },
    );
  }

  Widget _buildPlatformsTab() {
    final platforms = ['X (Twitter)', 'Facebook', 'Instagram'];
    final keys = ['TWITTER', 'FACEBOOK', 'INSTAGRAM'];

    return RefreshIndicator(
      color: AppTheme.accent,
      backgroundColor: AppTheme.cardBackground,
      onRefresh: _loadConfigs,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ...List.generate(platforms.length, (index) {
            final key = keys[index];
            final config = _configs.cast<Map<String, dynamic>>().firstWhere(
              (c) {
                final platform = c['platform'];
                return platform != null && platform.toString().toUpperCase() == key;
              },
              orElse: () => <String, dynamic>{},
            );
            final isConfigured = config.isNotEmpty;

            return Card(
              color: AppTheme.cardBackground,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(platforms[index],
                            style: Theme.of(context).textTheme.titleMedium),
                        Chip(
                          backgroundColor: isConfigured
                              ? Colors.greenAccent.withOpacity(0.15)
                              : Colors.orangeAccent.withOpacity(0.15),
                          label: Text(
                            isConfigured ? 'مفعّل' : 'غير مفعّل',
                            style: TextStyle(
                              color: isConfigured ? Colors.greenAccent : Colors.orangeAccent,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    if (isConfigured)
                      ObituaryPreviewCard(
                        platform: platforms[index],
                        obituaryText: config['obituaryText']?.toString(),
                        donationLink: config['donationLink']?.toString(),
                      )
                    else
                      Text(
                        'لم يتم تكوين المنصة بعد. اضغط "تكوين" لإعداد رسالة النعي ورابط التبرع.',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: _isLoading
                                ? null
                                : () => _showPlatformConfigDialog(context, key),
                            icon: const Icon(Icons.settings_rounded),
                            label: Text(isConfigured ? 'تعديل' : 'تكوين'),
                            style: _elevatedStyle(),
                          ),
                        ),
                        if (isConfigured) ...[
                          const SizedBox(width: 10),
                          IconButton(
                            onPressed: () => _deleteConfig(config['configID'].toString()),
                            icon: const Icon(Icons.delete_outline_rounded,
                                color: Colors.redAccent),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  void _showPlatformConfigDialog(BuildContext context, String platform) {
    final obituaryCtrl = TextEditingController();
    final donationCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.cardBackground,
        title: Text('تكوين $platform'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: obituaryCtrl,
                maxLines: 4,
                decoration: InputDecoration(
                  labelText: 'نص النعي',
                  filled: true,
                  fillColor: AppTheme.primaryBackground,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: donationCtrl,
                decoration: InputDecoration(
                  labelText: 'رابط التبرع (اختياري)',
                  filled: true,
                  fillColor: AppTheme.primaryBackground,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء')),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await _savePlatform(
                platform,
                obituaryCtrl.text.trim(),
                donationLink:
                    donationCtrl.text.trim().isEmpty ? null : donationCtrl.text.trim(),
              );
            },
            child: const Text('حفظ'),
          ),
        ],
      ),
    );
  }

  Widget _buildDestructTab() {
    return RefreshIndicator(
      color: AppTheme.accent,
      backgroundColor: AppTheme.cardBackground,
      onRefresh: _loadConfigs,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isLoading ? null : () => _showAddDestructDialog(context),
                icon: const Icon(Icons.add_rounded),
                label: const Text('إضافة عنصر للتدمير'),
                style: _elevatedStyle(),
              ),
            ),
            const SizedBox(height: 20),
            if (_isLoading && _destructItems.isEmpty)
              const Center(child: CircularProgressIndicator())
            else
              SelfDestructChecklist(
                items: _destructItems,
                onConfirm: _confirmDestructItem,
                onDelete: _deleteDestructItem,
              ),
          ],
        ),
      ),
    );
  }

  void _showAddDestructDialog(BuildContext context) {
    final descCtrl = TextEditingController();
    String targetType = 'social_post';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setState) {
          return AlertDialog(
            backgroundColor: AppTheme.cardBackground,
            title: const Text('إضافة عنصر تدمير ذاتي'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DropdownButtonFormField<String>(
                    decoration: const InputDecoration(labelText: 'نوع الهدف'),
                    value: targetType,
                    dropdownColor: AppTheme.cardBackground,
                    items: const [
                      DropdownMenuItem(value: 'social_post', child: Text('منشور اجتماعي')),
                      DropdownMenuItem(value: 'file', child: Text('ملف')),
                      DropdownMenuItem(value: 'account', child: Text('حساب')),
                      DropdownMenuItem(value: 'message', child: Text('رسالة')),
                    ],
                    onChanged: (v) => setState(() => targetType = v ?? 'social_post'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: descCtrl,
                    decoration: InputDecoration(
                      labelText: 'الوصف',
                      filled: true,
                      fillColor: AppTheme.primaryBackground,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء')),
              TextButton(
                onPressed: () async {
                  if (descCtrl.text.trim().isEmpty) return;
                  Navigator.pop(ctx);
                  await _addDestructItem(targetType, descCtrl.text.trim(), 1);
                },
                child: const Text('إضافة'),
              ),
            ],
          );
        },
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

  Widget _emptyState({
    required IconData icon,
    required String message,
    required String subMessage,
  }) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: AppTheme.textSecondary, size: 64),
          const SizedBox(height: 16),
          Text(message, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Text(subMessage, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}
