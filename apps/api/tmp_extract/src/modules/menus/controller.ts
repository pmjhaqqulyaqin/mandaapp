import { Request, Response } from 'express';
import * as menusService from './service';

export const getMenusHandler = async (req: Request, res: Response) => {
  try {
    const menus = await menusService.getMenus();
    res.json(menus);
  } catch (error) {
    console.error('Error fetching menus:', error);
    res.status(500).json({ error: 'Failed to fetch menus' });
  }
};

export const createMenuHandler = async (req: Request, res: Response) => {
  try {
    const menu = await menusService.createMenu(req.body);
    res.status(201).json(menu);
  } catch (error) {
    console.error('Error creating menu:', error);
    res.status(500).json({ error: 'Failed to create menu' });
  }
};

export const updateMenuHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const menu = await menusService.updateMenu(id, req.body);
    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }
    res.json(menu);
  } catch (error) {
    console.error('Error updating menu:', error);
    res.status(500).json({ error: 'Failed to update menu' });
  }
};

export const deleteMenuHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const menu = await menusService.deleteMenu(id);
    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }
    res.json({ success: true, message: 'Menu deleted successfully' });
  } catch (error) {
    console.error('Error deleting menu:', error);
    res.status(500).json({ error: 'Failed to delete menu' });
  }
};
