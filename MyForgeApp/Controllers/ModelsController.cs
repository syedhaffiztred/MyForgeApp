﻿using Microsoft.AspNetCore.Mvc;
using MyForgeApp.Models;

namespace MyForgeApp.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ModelsController: ControllerBase
    {
        public record BucketObject(string name, string urn);

        private readonly APS _aps;

        public ModelsController(APS aps)
        {
            _aps = aps;
        }

        [HttpGet()]
        public async Task<IEnumerable<BucketObject>> GetModels()
        {
            var objects = await _aps.GetObjects();
            return from o in objects
                   select new BucketObject(o.ObjectKey, APS.Base64Encode(o.ObjectId));
        }

        [HttpGet("{urn}/status")]
        public async Task<TranslationStatus> GetModelStatus(string urn)
        {
            var status = await _aps.GetTranslationStatus(urn);
            return status;
        }

        public class UploadModelForm
        {
            [FromForm(Name = "model-zip-entrypoint")]
            public string? Entrypoint { get; set; }

            [FromForm(Name = "model-file")]
            public required IFormFile File { get; set; }
        }

        [HttpPost(), DisableRequestSizeLimit]
        public async Task<BucketObject> UploadAndTranslateModel([FromForm] UploadModelForm form)
        {
            using var stream = form.File.OpenReadStream();
            var obj = await _aps.UploadModel(form.File.FileName, stream);
            var job = await _aps.TranslateModel(obj.ObjectId, form.Entrypoint);
            return new BucketObject(obj.ObjectKey, job.Urn);
        }
    }
}
