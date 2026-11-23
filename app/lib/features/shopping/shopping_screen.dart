import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../app/theme/app_theme.dart';
import '../../features/grocery/data/grocery_models.dart';
import '../../features/grocery/state/grocery_provider.dart';
import '../../shared/widgets/app_components.dart';

class ShoppingScreen extends StatefulWidget {
  const ShoppingScreen({super.key});

  @override
  State<ShoppingScreen> createState() => _ShoppingScreenState();
}

class _ShoppingScreenState extends State<ShoppingScreen> {
  String? _selectedListId;

  @override
  Widget build(BuildContext context) {
    return Consumer<GroceryProvider>(
      builder: (context, grocery, _) {
        final lists = grocery.shoppingLists;
        final selectedList = lists.isEmpty
            ? null
            : lists.firstWhere(
                (list) => list.id == _selectedListId,
                orElse: () => lists.first,
              );

        return RefreshIndicator(
          onRefresh: grocery.loadShopping,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Danh sách đi chợ',
                            style: Theme.of(context).textTheme.headlineSmall),
                        const SizedBox(height: 4),
                        const Text(
                          'Lên danh sách và phân công mua sắm',
                          style: TextStyle(
                              color: AppColors.muted, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  IconButton.filled(
                    tooltip: 'Tạo danh sách',
                    onPressed: grocery.creatingShoppingList
                        ? null
                        : () => _createList(context, grocery),
                    style: IconButton.styleFrom(
                      backgroundColor: AppColors.green,
                      foregroundColor: Colors.white,
                    ),
                    icon: const Icon(Icons.playlist_add_rounded),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              if (grocery.loadingShopping && lists.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(36),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (grocery.shoppingError != null && lists.isEmpty)
                _ErrorPanel(
                  message: grocery.shoppingError!,
                  onRetry: grocery.loadShopping,
                )
              else if (selectedList == null)
                _EmptyShopping(onCreate: () => _createList(context, grocery))
              else ...[
                SurfaceCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Danh sách đang xem',
                          style: TextStyle(
                              color: AppColors.muted, fontSize: 11)),
                      const SizedBox(height: 8),
                      DropdownButtonFormField<String>(
                        initialValue: selectedList.id,
                        isExpanded: true,
                        decoration: const InputDecoration(
                          prefixIcon:
                              Icon(Icons.shopping_basket_outlined),
                        ),
                        items: lists
                            .map((list) => DropdownMenuItem(
                                  value: list.id,
                                  child: Text(list.name,
                                      overflow: TextOverflow.ellipsis),
                                ))
                            .toList(),
                        onChanged: (value) =>
                            setState(() => _selectedListId = value),
                      ),
                      if (selectedList.assignedTo.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            const Icon(Icons.person_outline_rounded,
                                size: 16, color: AppColors.muted),
                            const SizedBox(width: 6),
                            Text(
                              'Phụ trách: ${selectedList.assignedTo}',
                              style: const TextStyle(
                                  color: AppColors.muted, fontSize: 12),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: SectionHeading(
                        title: 'Mặt hàng',
                        actionLabel: '${selectedList.tasks.length}',
                      ),
                    ),
                    const SizedBox(width: 8),
                    FilledButton.icon(
                      onPressed: grocery.addingShoppingTask
                          ? null
                          : () => _addTask(context, grocery, selectedList),
                      icon: grocery.addingShoppingTask
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white),
                            )
                          : const Icon(Icons.add_rounded, size: 18),
                      label: Text(grocery.addingShoppingTask
                          ? 'Đang thêm'
                          : 'Thêm món'),
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.green,
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                if (selectedList.tasks.isEmpty)
                  const _EmptyTasks()
                else
                  SurfaceCard(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    child: Column(
                      children: [
                        for (var index = 0;
                            index < selectedList.tasks.length;
                            index++) ...[
                          _TaskTile(task: selectedList.tasks[index]),
                          if (index < selectedList.tasks.length - 1)
                            const Divider(height: 1),
                        ],
                      ],
                    ),
                  ),
                if (grocery.shoppingError != null) ...[
                  const SizedBox(height: 12),
                  _ErrorPanel(
                    message: grocery.shoppingError!,
                    onRetry: grocery.loadShopping,
                  ),
                ],
              ],
              const SizedBox(height: 16),
              const Text(
                'Danh sách được đồng bộ với máy chủ',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.muted, fontSize: 11),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _addTask(
    BuildContext context,
    GroceryProvider grocery,
    ShoppingList list,
  ) async {
    final formKey = GlobalKey<FormState>();
    final foodController = TextEditingController();
    final quantityController = TextEditingController(text: '1');
    var submitting = false;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) => StatefulBuilder(
        builder: (context, setSheetState) => Padding(
          padding: EdgeInsets.fromLTRB(
            20,
            22,
            20,
            MediaQuery.viewInsetsOf(context).bottom + 24,
          ),
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Thêm mặt hàng',
                    style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 6),
                Text(list.name,
                    style: const TextStyle(
                        color: AppColors.muted, fontSize: 12)),
                const SizedBox(height: 18),
                TextFormField(
                  controller: foodController,
                  autofocus: true,
                  decoration: const InputDecoration(
                    labelText: 'Tên thực phẩm',
                    prefixIcon: Icon(Icons.shopping_bag_outlined),
                  ),
                  validator: (value) => value == null || value.trim().isEmpty
                      ? 'Nhập tên mặt hàng'
                      : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: quantityController,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(
                    labelText: 'Số lượng',
                    prefixIcon: Icon(Icons.numbers_rounded),
                  ),
                  validator: (value) => value == null ||
                          double.tryParse(value) == null ||
                          double.parse(value) <= 0
                      ? 'Số lượng phải lớn hơn 0'
                      : null,
                ),
                const SizedBox(height: 18),
                ElevatedButton(
                  onPressed: submitting
                      ? null
                      : () async {
                          if (!formKey.currentState!.validate()) return;
                          setSheetState(() => submitting = true);
                          try {
                            await grocery.addShoppingTask(
                              listId: list.id,
                              foodName: foodController.text.trim(),
                              quantity: quantityController.text.trim(),
                            );
                            if (sheetContext.mounted) {
                              Navigator.of(sheetContext).pop();
                            }
                          } catch (error) {
                            if (sheetContext.mounted) {
                              _showMessage(
                                sheetContext,
                                _errorMessage(error),
                              );
                            }
                          } finally {
                            if (sheetContext.mounted) {
                              setSheetState(() => submitting = false);
                            }
                          }
                        },
                  child: submitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('Thêm vào danh sách'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    foodController.dispose();
    quantityController.dispose();
  }

  Future<void> _createList(
    BuildContext context,
    GroceryProvider grocery,
  ) async {
    final formKey = GlobalKey<FormState>();
    final nameController = TextEditingController();
    final assigneeController = TextEditingController();
    var submitting = false;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) => StatefulBuilder(
        builder: (context, setSheetState) => Padding(
          padding: EdgeInsets.fromLTRB(
            20,
            22,
            20,
            MediaQuery.viewInsetsOf(context).bottom + 24,
          ),
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Tạo danh sách đi chợ',
                    style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 18),
                TextFormField(
                  controller: nameController,
                  decoration: const InputDecoration(
                    labelText: 'Tên danh sách',
                    hintText: 'Ví dụ: Đi chợ cuối tuần',
                  ),
                  validator: (value) => value == null || value.trim().isEmpty
                      ? 'Nhập tên danh sách'
                      : null,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: assigneeController,
                  decoration: const InputDecoration(
                    labelText: 'Phân công cho (không bắt buộc)',
                    prefixIcon: Icon(Icons.person_outline_rounded),
                  ),
                ),
                const SizedBox(height: 18),
                ElevatedButton(
                  onPressed: submitting
                      ? null
                      : () async {
                          if (!formKey.currentState!.validate()) return;
                          setSheetState(() => submitting = true);
                          try {
                            await grocery.createShoppingList(
                              name: nameController.text.trim(),
                              assignedTo: assigneeController.text.trim(),
                            );
                            if (sheetContext.mounted) {
                              Navigator.of(sheetContext).pop();
                            }
                          } catch (error) {
                            if (sheetContext.mounted) {
                              _showMessage(
                                sheetContext,
                                _errorMessage(error),
                              );
                            }
                          } finally {
                            if (sheetContext.mounted) {
                              setSheetState(() => submitting = false);
                            }
                          }
                        },
                  child: submitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('Tạo danh sách'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    nameController.dispose();
    assigneeController.dispose();
  }
}

class _TaskTile extends StatelessWidget {
  const _TaskTile({required this.task});

  final ShoppingTask task;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 13),
      child: Row(
        children: [
          Icon(
            task.completed
                ? Icons.check_circle_rounded
                : Icons.radio_button_unchecked_rounded,
            color: task.completed ? AppColors.green : AppColors.muted,
            size: 21,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              task.name,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                decoration: task.completed ? TextDecoration.lineThrough : null,
                color: task.completed ? AppColors.muted : AppColors.ink,
              ),
            ),
          ),
          Text(
            '× ${task.quantity}',
            style: const TextStyle(
                color: AppColors.muted, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

class _EmptyShopping extends StatelessWidget {
  const _EmptyShopping({required this.onCreate});

  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    return SurfaceCard(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Column(
          children: [
            const Icon(Icons.shopping_basket_outlined,
                size: 38, color: AppColors.muted),
            const SizedBox(height: 10),
            const Text('Chưa có danh sách đi chợ',
                style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            const Text('Tạo danh sách và phân công mua sắm.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.muted, fontSize: 12)),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: onCreate,
              icon: const Icon(Icons.add_rounded),
              label: const Text('Tạo danh sách'),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyTasks extends StatelessWidget {
  const _EmptyTasks();

  @override
  Widget build(BuildContext context) {
    return const SurfaceCard(
      child: Padding(
        padding: EdgeInsets.symmetric(vertical: 22),
        child: Text(
          'Danh sách chưa có món nào.',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.muted),
        ),
      ),
    );
  }
}

class _ErrorPanel extends StatelessWidget {
  const _ErrorPanel({required this.message, required this.onRetry});

  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return SurfaceCard(
      child: Column(
        children: [
          Text(message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.red, fontSize: 12)),
          TextButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Thử lại'),
          ),
        ],
      ),
    );
  }
}

String _errorMessage(Object error) =>
    error.toString().replaceFirst('Exception: ', '');

void _showMessage(BuildContext context, String message) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}
