import { Request, Response } from 'express';
import * as pagesService from './service';
import { auth } from "../auth";
import { fromNodeHeaders } from "better-auth/node";

export const getPagesHandler = async (req: Request, res: Response) => {
  try {
    const pages = await pagesService.getPages();
    res.json(pages);
  } catch (error) {
    console.error('Error fetching pages:', error);
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
};

export const getPageBySlugHandler = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const page = await pagesService.getPageBySlug(slug);
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }
    res.json(page);
  } catch (error) {
    console.error('Error fetching page by slug:', error);
    res.status(500).json({ error: 'Failed to fetch page' });
  }
};

export const createPageHandler = async (req: Request, res: Response) => {
  try {
    let userId: string | undefined;

    // Try to get user session from better-auth first
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });
      if (session) {
        userId = session.user.id;
      }
    } catch {
      // Session lookup failed, will try fallback
    }

    // Fallback: read X-User-Id header
    if (!userId) {
      userId = (req.headers as any)["x-user-id"] || (req.headers as any).get?.("x-user-id");
    }

    if (!userId) {
      console.warn("Unauthorized attempt to create page");
      return res.status(401).json({ error: "Unauthorized. Please log in." });
    }

    const page = await pagesService.createPage({
       ...req.body,
       authorId: userId,
    });
    res.status(201).json(page);
  } catch (error) {
    console.error('Error creating page:', error);
    res.status(500).json({ error: 'Failed to create page' });
  }
};

export const updatePageHandler = async (req: Request, res: Response) => {
  try {
    let userId: string | undefined;

    // Try to get user session from better-auth first
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });
      if (session) {
        userId = session.user.id;
      }
    } catch {
      // Session lookup failed, will try fallback
    }

    // Fallback: read X-User-Id header
    if (!userId) {
      userId = (req.headers as any)["x-user-id"] || (req.headers as any).get?.("x-user-id");
    }

    if (!userId) {
      console.warn("Unauthorized attempt to update page");
      return res.status(401).json({ error: "Unauthorized. Please log in." });
    }

    const { id } = req.params;
    const page = await pagesService.updatePage(id, req.body);
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }
    res.json(page);
  } catch (error) {
    console.error('Error updating page:', error);
    res.status(500).json({ error: 'Failed to update page' });
  }
};

export const deletePageHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const page = await pagesService.deletePage(id);
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }
    res.json({ success: true, message: 'Page deleted successfully' });
  } catch (error) {
    console.error('Error deleting page:', error);
    res.status(500).json({ error: 'Failed to delete page' });
  }
};
