using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using UnityEditor;
using UnityEngine;

namespace MumbleVoiceLab.Editor
{
    internal static class MumbleCli
    {
        internal struct RunResult
        {
            public int ExitCode;
            public string Stdout;
            public string Stderr;
        }

        internal static string ProjectRoot
        {
            get { return Directory.GetParent(Application.dataPath).FullName; }
        }

        internal static bool TryFindRepositoryRoot(out string root)
        {
            var current = ProjectRoot;
            while (!string.IsNullOrEmpty(current))
            {
                if (File.Exists(Path.Combine(current, "scripts", "mvl.ts")) &&
                    File.Exists(Path.Combine(current, "package.json")))
                {
                    root = current;
                    return true;
                }

                current = Directory.GetParent(current)?.FullName;
            }

            root = ProjectRoot;
            return false;
        }

        internal static string AssetPathToAbsolute(string assetPath)
        {
            if (Path.IsPathRooted(assetPath))
            {
                return Path.GetFullPath(assetPath);
            }

            return Path.GetFullPath(Path.Combine(ProjectRoot, assetPath));
        }

        internal static string AbsoluteToAssetPath(string absolutePath)
        {
            var full = Path.GetFullPath(absolutePath).Replace('\\', '/');
            var root = Path.GetFullPath(ProjectRoot).Replace('\\', '/').TrimEnd('/');
            if (!full.StartsWith(root + "/", StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            return full.Substring(root.Length + 1);
        }

        internal static RunResult RunMvl(string repositoryRoot, IList<string> args)
        {
            var fullArgs = new List<string> { "tsx", "scripts/mvl.ts" };
            fullArgs.AddRange(args);
            return RunCommand(NpxCommand(), fullArgs, repositoryRoot);
        }

        private static RunResult RunCommand(string fileName, IList<string> args, string workingDirectory)
        {
            var startInfo = new ProcessStartInfo
            {
                FileName = fileName,
                Arguments = JoinArguments(args),
                WorkingDirectory = workingDirectory,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true
            };

            using (var process = Process.Start(startInfo))
            {
                if (process == null)
                {
                    throw new InvalidOperationException("Failed to start Mumble Voice Lab CLI.");
                }

                var stdout = process.StandardOutput.ReadToEnd();
                var stderr = process.StandardError.ReadToEnd();
                process.WaitForExit();

                return new RunResult
                {
                    ExitCode = process.ExitCode,
                    Stdout = stdout,
                    Stderr = stderr
                };
            }
        }

        private static string NpxCommand()
        {
            return Application.platform == RuntimePlatform.WindowsEditor ? "npx.cmd" : "npx";
        }

        private static string JoinArguments(IList<string> args)
        {
            var quoted = new string[args.Count];
            for (var i = 0; i < args.Count; i += 1)
            {
                quoted[i] = Quote(args[i]);
            }

            return string.Join(" ", quoted);
        }

        private static string Quote(string value)
        {
            if (string.IsNullOrEmpty(value))
            {
                return "\"\"";
            }

            return "\"" + value.Replace("\"", "\\\"") + "\"";
        }
    }
}
