import * as fs from 'fs-extra';
import * as path from 'path';
import { createWriteStream } from 'fs';
import { IStorage } from '../storage';
import { Agent, Task, InsertArtifact } from '@shared/schema';

export class FileCreationService {
  private outputDir: string;

  constructor(private storage: IStorage) {
    this.outputDir = path.join(process.cwd(), 'generated_artifacts');
    this.ensureOutputDirectory();
  }

  private async ensureOutputDirectory(): Promise<void> {
    try {
      await fs.ensureDir(this.outputDir);
    } catch (error) {
      console.error('Error creating output directory:', error);
    }
  }

  async createUserStoryDocument(agent: Agent, task: Task, content: string): Promise<string> {
    const officegen = await import('officegen');
    
    // Create a new Word document
    const docx = officegen.default('docx');
    
    // Set document properties using correct officegen API
    docx.setDocTitle('User Stories');
    docx.setDocSubject(`User Stories for Task: ${task.title}`);
    docx.setDocKeywords('user stories, requirements, agile');

    // Add header
    const header = docx.createP();
    header.addText('User Stories Document', { bold: true, font_size: 18 });
    
    // Add task information
    const taskInfo = docx.createP();
    taskInfo.addLineBreak();
    taskInfo.addText(`Task: ${task.title}`, { bold: true, font_size: 14 });
    taskInfo.addLineBreak();
    taskInfo.addText(`Description: ${task.description || 'No description provided'}`, { font_size: 12 });
    taskInfo.addLineBreak();
    taskInfo.addText(`Priority: ${task.priority}`, { font_size: 12 });
    taskInfo.addLineBreak();
    taskInfo.addText(`Created by: ${agent.name}`, { font_size: 12 });
    taskInfo.addLineBreak();
    taskInfo.addText(`Date: ${new Date().toLocaleDateString()}`, { font_size: 12 });

    // Add content
    const contentParagraph = docx.createP();
    contentParagraph.addLineBreak();
    contentParagraph.addText('User Stories:', { bold: true, font_size: 14 });
    contentParagraph.addLineBreak();
    contentParagraph.addText(content, { font_size: 12 });

    // Generate filename
    const filename = `user_stories_task_${task.id}_${Date.now()}.docx`;
    const filepath = path.join(this.outputDir, filename);

    // Save the document
    await new Promise<void>((resolve, reject) => {
      const out = createWriteStream(filepath);
      
      out.on('error', (err) => {
        console.error('Error writing User Stories Word document:', err);
        reject(err);
      });
      
      out.on('close', () => {
        console.log(`User Stories Word document created: ${filepath}`);
        resolve();
      });
      
      docx.generate(out);
    });

    // Create artifact record
    const artifact: InsertArtifact = {
      taskId: task.id,
      name: `User Stories - ${task.title}`,
      description: `User stories document created by ${agent.name} for task ${task.id}`,
      type: 'document',
      content: content,
      filePath: filepath,
      fileName: filename,
      metadata: {
        agentId: agent.id,
        documentType: 'user_stories',
        wordDocument: true,
        createdAt: new Date().toISOString(),
        fileSize: (await fs.stat(filepath)).size
      }
    };

    await this.storage.createArtifact(artifact);

    return filepath;
  }

  async createBusinessAnalysisDocument(agent: Agent, task: Task, content: string): Promise<string> {
    const officegen = await import('officegen');
    
    // Create a new Word document
    const docx = officegen.default('docx');
    
    // Set document properties using correct officegen API
    docx.setDocTitle('Business Analysis');
    docx.setDocSubject(`Business Analysis for Task: ${task.title}`);
    docx.setDocKeywords('business analysis, requirements, workflows');

    // Add header
    const header = docx.createP();
    header.addText('Business Analysis Document', { bold: true, font_size: 18 });
    
    // Add task information
    const taskInfo = docx.createP();
    taskInfo.addLineBreak();
    taskInfo.addText(`Task: ${task.title}`, { bold: true, font_size: 14 });
    taskInfo.addLineBreak();
    taskInfo.addText(`Description: ${task.description || 'No description provided'}`, { font_size: 12 });
    taskInfo.addLineBreak();
    taskInfo.addText(`Priority: ${task.priority}`, { font_size: 12 });
    taskInfo.addLineBreak();
    taskInfo.addText(`Analyzed by: ${agent.name}`, { font_size: 12 });
    taskInfo.addLineBreak();
    taskInfo.addText(`Date: ${new Date().toLocaleDateString()}`, { font_size: 12 });

    // Add content
    const contentParagraph = docx.createP();
    contentParagraph.addLineBreak();
    contentParagraph.addText('Business Analysis:', { bold: true, font_size: 14 });
    contentParagraph.addLineBreak();
    contentParagraph.addText(content, { font_size: 12 });

    // Generate filename
    const filename = `business_analysis_task_${task.id}_${Date.now()}.docx`;
    const filepath = path.join(this.outputDir, filename);

    // Save the document
    await new Promise<void>((resolve, reject) => {
      const out = createWriteStream(filepath);
      
      out.on('error', (err) => {
        console.error('Error writing Business Analysis Word document:', err);
        reject(err);
      });
      
      out.on('close', () => {
        console.log(`Business Analysis Word document created: ${filepath}`);
        resolve();
      });
      
      docx.generate(out);
    });

    // Create artifact record
    const artifact: InsertArtifact = {
      taskId: task.id,
      name: `Business Analysis - ${task.title}`,
      description: `Business analysis document created by ${agent.name} for task ${task.id}`,
      type: 'document',
      content: content,
      filePath: filepath,
      fileName: filename,
      metadata: {
        agentId: agent.id,
        documentType: 'business_analysis',
        wordDocument: true,
        createdAt: new Date().toISOString(),
        fileSize: (await fs.stat(filepath)).size
      }
    };

    await this.storage.createArtifact(artifact);

    return filepath;
  }

  async createCodeFile(agent: Agent, task: Task, content: string, language: string): Promise<string> {
    const fileExtensions: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      csharp: 'cs',
      php: 'php',
      ruby: 'rb',
      go: 'go',
      rust: 'rs',
      html: 'html',
      css: 'css',
      sql: 'sql',
      json: 'json',
      yaml: 'yml',
      xml: 'xml'
    };

    const extension = fileExtensions[language.toLowerCase()] || 'txt';
    const filename = `code_task_${task.id}_${Date.now()}.${extension}`;
    const filepath = path.join(this.outputDir, filename);

    // Add header comment
    const headerComment = `/*
 * Code generated by ${agent.name} (AI Agent)
 * Task: ${task.title}
 * Generated: ${new Date().toISOString()}
 * Language: ${language}
 */

`;

    const fullContent = headerComment + content;

    // Write the file
    await fs.writeFile(filepath, fullContent, 'utf8');

    // Create artifact record
    const artifact: InsertArtifact = {
      taskId: task.id,
      name: `Code File - ${task.title}`,
      description: `${language} code file created by ${agent.name} for task ${task.id}`,
      type: 'code',
      content: fullContent,
      filePath: filepath,
      fileName: filename,
      metadata: {
        agentId: agent.id,
        language: language,
        extension: extension,
        createdAt: new Date().toISOString(),
        fileSize: (await fs.stat(filepath)).size
      }
    };

    await this.storage.createArtifact(artifact);

    return filepath;
  }

  async createTextFile(agent: Agent, task: Task, content: string, filename?: string): Promise<string> {
    const defaultFilename = `document_task_${task.id}_${Date.now()}.txt`;
    const finalFilename = filename || defaultFilename;
    const filepath = path.join(this.outputDir, finalFilename);

    // Add header
    const headerContent = `Document created by ${agent.name} (AI Agent)
Task: ${task.title}
Generated: ${new Date().toISOString()}
================================

`;

    const fullContent = headerContent + content;

    // Write the file
    await fs.writeFile(filepath, fullContent, 'utf8');

    // Create artifact record
    const artifact: InsertArtifact = {
      taskId: task.id,
      name: `Text Document - ${task.title}`,
      description: `Text document created by ${agent.name} for task ${task.id}`,
      type: 'document',
      content: fullContent,
      filePath: filepath,
      fileName: finalFilename,
      metadata: {
        agentId: agent.id,
        documentType: 'text',
        createdAt: new Date().toISOString(),
        fileSize: (await fs.stat(filepath)).size
      }
    };

    await this.storage.createArtifact(artifact);

    return filepath;
  }

  async createZipArchive(agent: Agent, task: Task, files: string[], archiveName?: string): Promise<string> {
    const archiver = await import('archiver');
    
    const defaultName = `archive_task_${task.id}_${Date.now()}.zip`;
    const finalName = archiveName || defaultName;
    const filepath = path.join(this.outputDir, finalName);

    const output = createWriteStream(filepath);
    const archive = archiver.default('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on('close', async () => {
        console.log(`Archive created: ${filepath} (${archive.pointer()} bytes)`);
        
        // Create artifact record
        const artifact: InsertArtifact = {
          taskId: task.id,
          name: `Archive - ${task.title}`,
          description: `Archive created by ${agent.name} for task ${task.id}`,
          type: 'archive',
          content: `Archive containing ${files.length} files`,
          filePath: filepath,
          fileName: finalName,
          metadata: {
            agentId: agent.id,
            archiveType: 'zip',
            fileCount: files.length,
            createdAt: new Date().toISOString(),
            fileSize: archive.pointer()
          }
        };

        await this.storage.createArtifact(artifact);
        resolve(filepath);
      });

      archive.on('error', (err) => {
        console.error('Error creating archive:', err);
        reject(err);
      });

      archive.pipe(output);

      // Add files to archive
      for (const file of files) {
        try {
          if (fs.existsSync(file)) {
            archive.file(file, { name: path.basename(file) });
          }
        } catch (error) {
          console.error(`Error checking file existence: ${file}`, error);
        }
      }

      archive.finalize();
    });
  }

  async getArtifactPath(taskId: number, fileName: string): Promise<string> {
    return path.join(this.outputDir, `task_${taskId}_${fileName}`);
  }

  async listGeneratedFiles(taskId?: number): Promise<string[]> {
    try {
      const files = await fs.readdir(this.outputDir);
      if (taskId) {
        return files.filter(file => file.includes(`task_${taskId}_`));
      }
      return files;
    } catch (error) {
      console.error('Error listing generated files:', error);
      return [];
    }
  }

  async deleteFile(filepath: string): Promise<void> {
    try {
      await fs.unlink(filepath);
      console.log(`File deleted: ${filepath}`);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }
}