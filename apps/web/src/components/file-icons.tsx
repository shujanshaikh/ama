import {
    SiReact,
    SiTypescript,
    SiJavascript,
    SiCss,
    SiHtml5,
    SiJson,
    SiMarkdown,
    SiSvg,
    SiEjs,
} from '@icons-pack/react-simple-icons';
import { FileCode2 } from 'lucide-react';

export const iconMap = {
    ts: { component: SiTypescript, color: '#3178C6' },
    tsx: { component: SiReact, color: '#149ECA' },
    js: { component: SiJavascript, color: '#F7DF1E' },
    jsx: { component: SiReact, color: '#149ECA' },
    
    css: { component: SiCss, color: '#1572B6' },
    html: { component: SiHtml5, color: '#E34F26' },
    ejs: { component: SiEjs, color: '#000000' },
    
    svg: { component: SiSvg, color: '#E34F26' },
    json: { component: SiJson, color: '#F5F5F5' },
    md: { component: SiMarkdown, color: '#FFFFFF' },
    markdown: { component: SiMarkdown, color: '#FFFFFF' },
    
    react: { component: SiReact, color: '#149ECA' },
    typescript: { component: SiTypescript, color: '#3178C6' },
    javascript: { component: SiJavascript, color: '#F7DF1E' },
};


export const getFileIcon = (filePath: string) => {
    const extension = filePath.split('.').pop()?.toLowerCase();
    const iconEntry = iconMap[extension as keyof typeof iconMap];
    
    if (iconEntry) {
      const IconComponent = iconEntry.component;
      return <IconComponent color={iconEntry.color} size={18} />;
    }
    return <FileCode2 className="w-[18px] h-[18px] text-zinc-400" />;
  };